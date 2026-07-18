"use client";

import { Square } from "lucide-react";
import type { SpeechVoiceOption } from "@/lib/speech/useSpeechSynthesis";
import { SPEECH_RATES, type SpeechRate } from "@/lib/speech/speechStorage";

type SpeechControlsProps = {
  isSupported: boolean;
  isEnabled: boolean;
  isSpeaking: boolean;
  voices: SpeechVoiceOption[];
  selectedVoiceURI: string | null;
  rate: SpeechRate;
  onVoiceChange: (uri: string) => void;
  onRateChange: (rate: SpeechRate) => void;
  onStop: () => void;
  /**
   * "advanced" = selectores de voz/velocidad (ocultos en UI actual).
   * "stop-only" = solo botón Detener (uso en la barra del input).
   */
  variant?: "advanced" | "stop-only";
};

/** Botón Detener lectura TTS (reutilizable). */
export function StopSpeechButton({
  onStop,
  className = "",
}: {
  onStop: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onStop}
      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium border border-red-100 ${className}`}
      aria-label="Detener lectura en voz alta"
      title="Detener lectura"
    >
      <Square size={14} fill="currentColor" />
      <span>Detener</span>
    </button>
  );
}

/**
 * Controles de voz.
 * La lógica de Speech API vive en useSpeechSynthesis.
 * Por defecto la UI avanzada está disponible pero el chat usa variant="stop-only".
 */
export default function SpeechControls({
  isSupported,
  isEnabled,
  isSpeaking,
  voices,
  selectedVoiceURI,
  rate,
  onVoiceChange,
  onRateChange,
  onStop,
  variant = "advanced",
}: SpeechControlsProps) {
  if (!isSupported || !isEnabled) return null;

  if (variant === "stop-only") {
    if (!isSpeaking) return null;
    return <StopSpeechButton onStop={onStop} />;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 w-full rounded-xl bg-emerald-50/70 border border-emerald-100 px-2 py-1.5"
      role="group"
      aria-label="Controles de voz del asistente"
    >
      <span className="text-[10px] sm:text-xs font-medium text-emerald-800 shrink-0">
        Voz
      </span>

      <label className="sr-only" htmlFor="ai-avatar-voice-select">
        Voz del asistente
      </label>
      <select
        id="ai-avatar-voice-select"
        className="min-w-0 flex-1 max-w-full sm:max-w-[14rem] truncate text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-400"
        value={selectedVoiceURI ?? ""}
        onChange={(e) => onVoiceChange(e.target.value)}
        disabled={voices.length === 0}
        title="Seleccionar voz"
        aria-label="Seleccionar voz del asistente"
      >
        {voices.length === 0 ? (
          <option value="">Cargando voces…</option>
        ) : (
          voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.label}
            </option>
          ))
        )}
      </select>

      <label className="sr-only" htmlFor="ai-avatar-rate-select">
        Velocidad de lectura
      </label>
      <select
        id="ai-avatar-rate-select"
        className="shrink-0 text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-400"
        value={String(rate)}
        onChange={(e) => onRateChange(Number(e.target.value) as SpeechRate)}
        title="Velocidad de lectura"
        aria-label="Velocidad de lectura"
      >
        {SPEECH_RATES.map((r) => (
          <option key={r} value={r}>
            {r === 1 ? "1x" : `${r}x`}
          </option>
        ))}
      </select>

      {isSpeaking && <StopSpeechButton onStop={onStop} />}
    </div>
  );
}
