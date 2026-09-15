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
  hideStop?: boolean;
};

/**
 * Botón Detener lectura TTS (reutilizable).
 *
 * `active` controla el estado visual: `true` mientras el avatar está
 * hablando (botón rojo, clickeable), `false` el resto del tiempo (gris,
 * deshabilitado). El botón permanece siempre montado — nunca desaparece
 * del layout — para evitar que el resto de los controles salten de
 * posición al iniciar/detener la lectura.
 */
export function StopSpeechButton({
  onStop,
  className = "",
  active = true,
}: {
  onStop: () => void;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={active ? onStop : undefined}
      disabled={!active}
      aria-pressed={active}
      aria-label={
        active ? "Detener lectura en voz alta" : "Lectura en voz alta detenida"
      }
      title={active ? "Detener lectura" : "El asistente no está hablando"}
      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
        active
          ? "bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
          : "bg-gray-50 text-gray-300 border-gray-100 cursor-default"
      } ${className}`}
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
  hideStop = false,
}: SpeechControlsProps) {
  if (!isSupported || !isEnabled) return null;

  if (variant === "stop-only") {
    // Siempre montado; el estado visual (activo/atenuado) lo controla `active`.
    return <StopSpeechButton onStop={onStop} active={isSpeaking} />;
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

      <StopSpeechButton onStop={onStop} active={isSpeaking} />
    </div>
  );
}
