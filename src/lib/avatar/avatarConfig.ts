import type { AvatarState } from "@/types/avatar";
import { AVATAR_STATES } from "@/types/avatar";
import { assistantExperience } from "@/lib/assistant/assistantExperienceConfig";

/**
 * Configuración del proveedor visual de imágenes locales.
 *
 * El proveedor activo se resuelve en assistantExperienceConfig
 * (NEXT_PUBLIC_AVATAR_PROVIDER). Hoy solo "local-image" está implementado.
 *
 * Para migrar a 3D / Rive / Live2D / LiveAvatar:
 * 1. Implementar el panel correspondiente.
 * 2. Registrar el case en AgentDock (AvatarExperienceRenderer).
 * 3. Activar NEXT_PUBLIC_AVATAR_PROVIDER=<provider>.
 * No hace falta reescribir ChatPanel.
 */

export const avatarProvider = assistantExperience.avatarProvider;

export type AvatarStateConfig = {
  /** Rutas absolutas desde /public */
  frames: readonly string[];
  /** Intervalo de rotación en ms; null = sin rotación */
  rotationMs: number | null;
  /** Texto de estado bajo el título (secundario) */
  label: string;
  /** Descripción accesible de la imagen */
  alt: string;
};

export const avatarConfig: Record<AvatarState, AvatarStateConfig> = {
  idle: {
    frames: ["/images/bot/normal.png"],
    rotationMs: null,
    label: "Listo para ayudarte",
    alt: "Avatar del asistente en estado listo",
  },
  thinking: {
    frames: [
      "/images/bot/pensando.png",
      "/images/bot/pensando1.png",
      "/images/bot/pensando2.png",
      "/images/bot/pensando3.png",
      "/images/bot/pensando4.png",
    ],
    rotationMs: 3000,
    label: "Analizando tu pregunta...",
    alt: "Avatar del asistente en estado pensando",
  },
  speaking: {
    frames: [
      "/images/bot/hablando.png",
      "/images/bot/explicandoManoArriba.png",
      "/images/bot/saludoNormal.png",
      "/images/bot/saludando.png",
    ],
    rotationMs: 2000,
    label: "Respondiendo...",
    alt: "Avatar del asistente en estado respondiendo",
  },
  happy: {
    frames: ["/images/bot/saludandoFeliz.png", "/images/bot/riendo.png"],
    rotationMs: 1800,
    label: "Consulta atendida",
    alt: "Avatar del asistente en estado contento",
  },
  error: {
    frames: ["/images/bot/serio.png"],
    rotationMs: null,
    label: "Hubo un problema",
    alt: "Avatar del asistente en estado de error",
  },
  listening: {
    frames: ["/images/bot/normal.png"],
    rotationMs: null,
    label: "Escuchando...",
    alt: "Avatar del asistente en estado escuchando",
  },
};

/** Mínimo de tiempo en thinking antes de permitir speaking. */
export const AVATAR_MIN_THINKING_MS = 800;

/** Duración del estado happy tras una respuesta exitosa. */
export const AVATAR_HAPPY_DURATION_MS = 1500;

/** Tiempo en error antes de volver a idle. */
export const AVATAR_ERROR_RECOVERY_MS = 3000;

/** Duración del crossfade entre frames/estados. */
export const AVATAR_FADE_MS = 280;

export function getAvatarStateConfig(state: AvatarState): AvatarStateConfig {
  return avatarConfig[state];
}

/** Rutas únicas de todos los frames (para precarga en cliente). */
export function getAllAvatarFrameSrcs(): string[] {
  const unique = new Set<string>();
  for (const state of AVATAR_STATES) {
    for (const frame of avatarConfig[state].frames) {
      unique.add(frame);
    }
  }
  return [...unique];
}
