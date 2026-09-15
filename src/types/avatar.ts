/**
 * Estados del avatar del asistente.
 *
 * Este contrato es independiente del proveedor visual.
 *
 * El chat solo emite estados; el panel / proveedor decide cómo
 * representarlos. La voz (TTS) también se sincroniza vía estos
 * estados (speaking mientras hay lectura). No acoplar RAG/Ollama aquí.
 */

export const AVATAR_STATES = [
  "idle",
  "thinking",
  "speaking",
  "happy",
  "error",
  "listening",
] as const;

export type AvatarState = (typeof AVATAR_STATES)[number];

/**
 * @deprecated Preferir `AvatarProvider` desde `@/types/assistantExperience`.
 * Se mantiene como alias de compatibilidad con avatarConfig legado.
 */
export type { AvatarProvider as AvatarProviderKind } from "@/types/assistantExperience";

/**
 * Callback que emite el chat hacia el orquestador (AgentDock).
 * El chat no conoce imágenes ni timings: solo solicita un AvatarState.
 * AgentDock aplica mínimos, auto-idle y anti-carreras.
 */
export type AvatarStateChangeHandler = (state: AvatarState) => void;

/** Estados en los que hay una operación de respuesta en curso. */
export const AVATAR_BUSY_STATES = ["thinking", "speaking"] as const;
export type AvatarBusyState = (typeof AVATAR_BUSY_STATES)[number];

export function isAvatarBusyState(state: AvatarState): state is AvatarBusyState {
  return (AVATAR_BUSY_STATES as readonly AvatarState[]).includes(state);
}
