"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeSpeechText } from "@/lib/speech/sanitizeSpeechText";
import type { SpeechRate } from "@/lib/speech/speechStorage";
import {
  extractCompleteSentences,
  logSpeechStream,
  shouldSpeakSentence,
} from "@/lib/speech/streamSpeechText";

export type StreamingSpeechCallbacks = {
  /** Stream + cola vacíos; lectura progresiva terminó (no por cancel). */
  onDone?: () => void;
};

export type UseStreamingSpeechSynthesisOptions = {
  /** Preferencias del hook base (voz / rate). */
  voiceURI: string | null;
  rate: SpeechRate;
  /**
   * false → no encola ni habla (ChatPanel no debería llamar push/finish).
   * Se relee en cada operación vía ref.
   */
  enabled: boolean;
  /** false si no hay Web Speech / provider none. */
  supported: boolean;
};

export type UseStreamingSpeechSynthesisResult = {
  /** Hay utterance activa o frases en cola. */
  isSpeaking: boolean;
  /** Sesión progresiva abierta (entre start y done/cancel). */
  isActive: boolean;
  /** Inicia sesión (limpia cola/buffer previos). */
  start: (callbacks?: StreamingSpeechCallbacks) => void;
  /** Acumula chunk del stream y encola frases completas. */
  pushText: (chunk: string) => void;
  /** Fin del stream: lee remanente y dispara onDone al vaciar la cola. */
  finish: () => void;
  /** Cancela utterance, cola y buffer; no llama onDone. */
  cancel: () => void;
};

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/**
 * Capa ligera sobre Web Speech API para leer frases mientras llega el stream.
 * No sustituye useSpeechSynthesis (prefs / toggle / speak one-shot).
 */
export function useStreamingSpeechSynthesis(
  options: UseStreamingSpeechSynthesisOptions,
): UseStreamingSpeechSynthesisResult {
  const { voiceURI, rate, enabled, supported } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const generationRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const bufferRef = useRef("");
  const streamDoneRef = useRef(false);
  const speakingRef = useRef(false);
  const cancelledRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const callbacksRef = useRef<StreamingSpeechCallbacks>({});

  const enabledRef = useRef(enabled);
  const supportedRef = useRef(supported);
  const voiceUriRef = useRef(voiceURI);
  const rateRef = useRef(rate);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    supportedRef.current = supported;
  }, [supported]);

  useEffect(() => {
    voiceUriRef.current = voiceURI;
  }, [voiceURI]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const syncSpeakingState = useCallback(() => {
    const active = speakingRef.current || queueRef.current.length > 0;
    setIsSpeaking(active);
  }, []);

  const clearSynth = useCallback(() => {
    cancelledRef.current = true;
    utteranceRef.current = null;
    speakingRef.current = false;
    try {
      getSpeechSynthesis()?.cancel();
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      cancelledRef.current = false;
    }, 0);
  }, []);

  const finishSessionIfIdle = useCallback((generation: number) => {
    if (generationRef.current !== generation) return;
    if (!streamDoneRef.current) return;
    if (speakingRef.current || queueRef.current.length > 0) return;

    logSpeechStream("queue_done");
    setIsActive(false);
    setIsSpeaking(false);
    const onDone = callbacksRef.current.onDone;
    callbacksRef.current = {};
    onDone?.();
  }, []);

  const pump = useCallback(
    (generation: number) => {
      if (generationRef.current !== generation) return;
      if (speakingRef.current) return;

      const synth = getSpeechSynthesis();
      if (!synth || !supportedRef.current || !enabledRef.current) {
        queueRef.current = [];
        finishSessionIfIdle(generation);
        return;
      }

      const next = queueRef.current.shift();
      if (!next) {
        syncSpeakingState();
        finishSessionIfIdle(generation);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(next);
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
        if (generationRef.current !== generation) return;
        speakingRef.current = true;
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (generationRef.current !== generation) return;
        if (cancelledRef.current) return;
        utteranceRef.current = null;
        speakingRef.current = false;
        syncSpeakingState();
        pump(generation);
      };

      utterance.onerror = () => {
        if (generationRef.current !== generation) return;
        if (cancelledRef.current) return;
        utteranceRef.current = null;
        speakingRef.current = false;
        logSpeechStream("utterance_error", { continue: true });
        syncSpeakingState();
        pump(generation);
      };

      utteranceRef.current = utterance;
      speakingRef.current = true;
      syncSpeakingState();

      try {
        synth.speak(utterance);
      } catch {
        speakingRef.current = false;
        utteranceRef.current = null;
        syncSpeakingState();
        pump(generation);
      }
    },
    [finishSessionIfIdle, syncSpeakingState],
  );

  const enqueueSentence = useCallback(
    (raw: string, generation: number) => {
      if (generationRef.current !== generation) return;
      if (!enabledRef.current || !supportedRef.current) return;
      if (!shouldSpeakSentence(raw)) return;

      const cleaned = sanitizeSpeechText(raw);
      if (!cleaned) return;

      queueRef.current.push(cleaned);
      logSpeechStream("queued_sentence", { chars: cleaned.length });
      syncSpeakingState();
      pump(generation);
    },
    [pump, syncSpeakingState],
  );

  const cancel = useCallback(() => {
    generationRef.current += 1;
    queueRef.current = [];
    bufferRef.current = "";
    streamDoneRef.current = false;
    callbacksRef.current = {};
    clearSynth();
    setIsActive(false);
    setIsSpeaking(false);
    logSpeechStream("cancelled");
  }, [clearSynth]);

  const start = useCallback(
    (callbacks?: StreamingSpeechCallbacks) => {
      generationRef.current += 1;
      const generation = generationRef.current;
      queueRef.current = [];
      bufferRef.current = "";
      streamDoneRef.current = false;
      clearSynth();
      callbacksRef.current = callbacks ?? {};
      cancelledRef.current = false;
      setIsActive(true);
      setIsSpeaking(false);
      logSpeechStream("start", { generation });
    },
    [clearSynth],
  );

  const pushText = useCallback(
    (chunk: string) => {
      if (!chunk) return;
      if (!enabledRef.current || !supportedRef.current) return;

      const generation = generationRef.current;
      if (generation === 0) return;

      bufferRef.current += chunk;
      const { complete, remainder } = extractCompleteSentences(
        bufferRef.current,
      );
      bufferRef.current = remainder;

      for (const sentence of complete) {
        enqueueSentence(sentence, generation);
      }
    },
    [enqueueSentence],
  );

  const finish = useCallback(() => {
    const generation = generationRef.current;
    if (generation === 0) return;

    streamDoneRef.current = true;

    const remaining = bufferRef.current.trim();
    bufferRef.current = "";

    if (remaining && enabledRef.current && supportedRef.current) {
      // Remanente final: leer aunque sea corto (fin de respuesta)
      const cleaned = sanitizeSpeechText(remaining);
      if (cleaned) {
        queueRef.current.push(cleaned);
        logSpeechStream("queued_remainder", { chars: cleaned.length });
        syncSpeakingState();
      }
    }

    logSpeechStream("finish", {
      remainder_chars: remaining.length,
      queue_len: queueRef.current.length,
    });

    if (!speakingRef.current && queueRef.current.length === 0) {
      finishSessionIfIdle(generation);
      return;
    }

    pump(generation);
  }, [finishSessionIfIdle, pump, syncSpeakingState]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      queueRef.current = [];
      bufferRef.current = "";
      try {
        getSpeechSynthesis()?.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    isSpeaking,
    isActive,
    start,
    pushText,
    finish,
    cancel,
  };
}
