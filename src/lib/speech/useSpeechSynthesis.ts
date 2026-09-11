"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeSpeechText } from "@/lib/speech/sanitizeSpeechText";
import {
  SPEECH_STORAGE_KEYS,
  type SpeechRate,
  readSpeechStorageBool,
  readSpeechStorageRate,
  readSpeechStorageString,
  writeSpeechStorageBool,
  writeSpeechStorageRate,
  writeSpeechStorageString,
} from "@/lib/speech/speechStorage";

export type SpeechVoiceOption = {
  voiceURI: string;
  name: string;
  lang: string;
  label: string;
};

export type SpeechSpeakCallbacks = {
  /** Se llama cuando termina de forma natural (no por cancel). */
  onEnd?: () => void;
  /** Se llama si la utterance falla (no por cancel). */
  onError?: () => void;
};

export type UseSpeechSynthesisOptions = {
  /** Preferencia inicial si no hay localStorage. Default false. */
  enabledByDefault?: boolean;
  /**
   * false cuando TTS provider es "none" o aún no implementado.
   * El hook no intenta usar speechSynthesis.
   */
  providerActive?: boolean;
};

export type UseSpeechSynthesisResult = {
  isSupported: boolean;
  isEnabled: boolean;
  isSpeaking: boolean;
  voices: SpeechVoiceOption[];
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: (uri: string | null) => void;
  rate: SpeechRate;
  setRate: (rate: SpeechRate) => void;
  setEnabled: (enabled: boolean) => void;
  /** Alias de setEnabled (API pedida en Fase 6). */
  setIsEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  speak: (text: string, callbacks?: SpeechSpeakCallbacks) => boolean;
  /** Cancela lectura activa sin disparar onEnd */
  cancel: () => void;
};

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function mapVoices(list: SpeechSynthesisVoice[]): SpeechVoiceOption[] {
  const mapped = list.map((v) => ({
    voiceURI: v.voiceURI,
    name: v.name,
    lang: v.lang,
    label: `${v.name} (${v.lang})`,
  }));

  // Español primero para UX
  return mapped.sort((a, b) => {
    const aEs = a.lang.toLowerCase().startsWith("es") ? 0 : 1;
    const bEs = b.lang.toLowerCase().startsWith("es") ? 0 : 1;
    if (aEs !== bEs) return aEs - bEs;
    return a.label.localeCompare(b.label, "es");
  });
}

function pickDefaultVoiceURI(
  options: SpeechVoiceOption[],
  preferredUri: string | null,
): string | null {
  if (preferredUri && options.some((v) => v.voiceURI === preferredUri)) {
    return preferredUri;
  }
  const esMx = options.find((v) => v.lang.toLowerCase().startsWith("es-mx"));
  if (esMx) return esMx.voiceURI;
  const es = options.find((v) => v.lang.toLowerCase().startsWith("es"));
  if (es) return es.voiceURI;
  return options[0]?.voiceURI ?? null;
}

/**
 * Hook de TTS local (Web Speech API).
 *
 * Interfaz estable para sustituir más adelante por un TTS externo
 * (misma API: speak / cancel / isEnabled) sin reescribir el chat.
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {},
): UseSpeechSynthesisResult {
  const { enabledByDefault = false, providerActive = true } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabledState] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechVoiceOption[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string | null>(
    null,
  );
  const [rate, setRateState] = useState<SpeechRate>(1);
  const [prefsReady, setPrefsReady] = useState(false);

  const cancelledRef = useRef(false);
  const callbacksRef = useRef<SpeechSpeakCallbacks>({});
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const rateRef = useRef<SpeechRate>(1);
  const voiceUriRef = useRef<string | null>(null);

  // Cargar preferencias (solo cliente)
  useEffect(() => {
    if (!providerActive) {
      setIsSupported(false);
      setIsEnabledState(false);
      setPrefsReady(true);
      return;
    }

    const storedEnabled = readSpeechStorageBool(SPEECH_STORAGE_KEYS.enabled);
    setIsEnabledState(
      storedEnabled !== null ? storedEnabled : enabledByDefault,
    );

    const storedRate = readSpeechStorageRate(SPEECH_STORAGE_KEYS.rate);
    const nextRate = storedRate ?? 1;
    rateRef.current = nextRate;
    setRateState(nextRate);

    const storedUri = readSpeechStorageString(SPEECH_STORAGE_KEYS.voiceUri);
    voiceUriRef.current = storedUri;
    setSelectedVoiceURIState(storedUri);

    setPrefsReady(true);

    const synth = getSpeechSynthesis();
    setIsSupported(synth !== null);
    if (!synth) return;

    const refreshVoices = () => {
      const mapped = mapVoices(synth.getVoices());
      setVoices(mapped);
      const nextUri = pickDefaultVoiceURI(mapped, voiceUriRef.current);
      voiceUriRef.current = nextUri;
      setSelectedVoiceURIState(nextUri);
    };

    refreshVoices();
    synth.addEventListener("voiceschanged", refreshVoices);
    return () => {
      synth.removeEventListener("voiceschanged", refreshVoices);
    };
  }, [providerActive, enabledByDefault]);

  const cancel = useCallback(() => {
    const synth = getSpeechSynthesis();
    cancelledRef.current = true;
    utteranceRef.current = null;
    callbacksRef.current = {};
    setIsSpeaking(false);
    try {
      synth?.cancel();
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      cancelledRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      try {
        getSpeechSynthesis()?.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        cancel();
      }
      setIsEnabledState(enabled);
      writeSpeechStorageBool(SPEECH_STORAGE_KEYS.enabled, enabled);
    },
    [cancel],
  );

  const setSelectedVoiceURI = useCallback((uri: string | null) => {
    voiceUriRef.current = uri;
    setSelectedVoiceURIState(uri);
    if (uri) {
      writeSpeechStorageString(SPEECH_STORAGE_KEYS.voiceUri, uri);
    }
  }, []);

  const setRate = useCallback((next: SpeechRate) => {
    rateRef.current = next;
    setRateState(next);
    writeSpeechStorageRate(SPEECH_STORAGE_KEYS.rate, next);
  }, []);

  const speak = useCallback(
    (text: string, callbacks?: SpeechSpeakCallbacks): boolean => {
      if (!providerActive || !prefsReady) return false;

      const synth = getSpeechSynthesis();
      if (!synth || !isEnabled) return false;

      const cleaned = sanitizeSpeechText(text);
      if (!cleaned) return false;

      cancelledRef.current = true;
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      cancelledRef.current = false;

      callbacksRef.current = callbacks ?? {};
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = rateRef.current;
      utterance.pitch = 1;

      const uri = voiceUriRef.current;
      const all = synth.getVoices();
      const match = uri ? all.find((v) => v.voiceURI === uri) : undefined;
      if (match) {
        utterance.voice = match;
        utterance.lang = match.lang;
      } else {
        utterance.lang = "es-MX";
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        utteranceRef.current = null;
        setIsSpeaking(false);
        if (cancelledRef.current) return;
        callbacksRef.current.onEnd?.();
        callbacksRef.current = {};
      };

      utterance.onerror = () => {
        utteranceRef.current = null;
        setIsSpeaking(false);
        if (cancelledRef.current) return;
        callbacksRef.current.onError?.();
        callbacksRef.current = {};
      };

      utteranceRef.current = utterance;
      try {
        synth.speak(utterance);
        return true;
      } catch {
        setIsSpeaking(false);
        callbacksRef.current.onError?.();
        callbacksRef.current = {};
        return false;
      }
    },
    [isEnabled, providerActive, prefsReady],
  );

  const toggleEnabled = useCallback(() => {
    setEnabled(!isEnabled);
  }, [isEnabled, setEnabled]);

  return {
    isSupported,
    isEnabled,
    isSpeaking,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    rate,
    setRate,
    setEnabled,
    setIsEnabled: setEnabled,
    toggleEnabled,
    speak,
    cancel,
  };
}
