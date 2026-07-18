import type { AvatarState } from "@/types/avatar";

/**
 * Configuración del proveedor experimental threejs.
 *
 * Modelo: public/models/avatar/avatar-tescha.glb
 * Activación: NEXT_PUBLIC_AVATAR_PROVIDER=threejs
 *
 * Calibración visual: ajustar modelPosition / modelScale / camera* aquí
 * (no hardcodear en los componentes).
 */

export type Vec3 = readonly [number, number, number];

export const AVATAR_3D_MODEL_PATH = "/models/avatar/avatar-tescha.glb";

/** Transform del modelo en escena. [x, y, z] — subir/bajar = cambiar Y. */
export const AVATAR_3D_MODEL_POSITION: Vec3 = [0, 0.95, 0];
export const AVATAR_3D_MODEL_SCALE = 3.30;
/** Yaw: 0 = frontal; Math.PI = girar 180° si aparece de espalda. */
export const AVATAR_3D_MODEL_ROTATION: Vec3 = [0, 0, 0];

/** Cámara frontal estable (cuerpo casi completo). */
export const AVATAR_3D_CAMERA_POSITION: Vec3 = [0, 1.15, 3.8];
export const AVATAR_3D_CAMERA_FOV = 32;
export const AVATAR_3D_CAMERA_TARGET: Vec3 = [0, 1.05, 0];

/** Luces */
export const AVATAR_3D_AMBIENT_INTENSITY = 0.85;
export const AVATAR_3D_KEY_LIGHT = {
  position: [2.2, 4.2, 3] as Vec3,
  intensity: 1.2,
};
export const AVATAR_3D_FILL_LIGHT = {
  position: [-2.2, 2.2, -1] as Vec3,
  intensity: 0.45,
};

/** Sombra de contacto bajo los pies (Y ≈ modelPosition.y). */
export const AVATAR_3D_SHADOW_POSITION: Vec3 = [0, 0.55, 0];

/** Interacción OrbitControls + auto-reset a vista frontal. */
export const AVATAR_3D_ENABLE_USER_ORBIT = true;
export const AVATAR_3D_ENABLE_AUTO_RESET = true;
/** Delay sin interacción antes de volver a la cámara inicial. */
export const AVATAR_3D_AUTO_RESET_DELAY_MS = 4000;
export const AVATAR_3D_ENABLE_DAMPING = true;
export const AVATAR_3D_DAMPING_FACTOR = 0.08;
/** Velocidad de interpolación del reset suave (mayor = más rápido). */
export const AVATAR_3D_RESET_LERP_SPEED = 2.8;
/** En pantallas angostas desactivar órbita para no pelear con el scroll. */
export const AVATAR_3D_DISABLE_ORBIT_BELOW_PX = 640;

/** Nombres de clips esperados dentro del GLB. */
export const AVATAR_3D_CLIP_NAMES = [
  "idle",
  "thinking",
  "speaking",
  "happy",
  "error",
  "listening",
  "greeting",
  "explain",
  "nod",
  "wave",
] as const;

export type Avatar3DClipName = (typeof AVATAR_3D_CLIP_NAMES)[number];

/** Mapeo AvatarState → clip del GLB. */
export const avatarStateToClip: Record<AvatarState, Avatar3DClipName> = {
  idle: "idle",
  thinking: "thinking",
  speaking: "speaking",
  happy: "happy",
  error: "error",
  listening: "listening",
};

/** Clips auxiliares reservados (no mapeados aún a AvatarState). */
export const AVATAR_3D_AUX_CLIPS: readonly Avatar3DClipName[] = [
  "greeting",
  "explain",
  "nod",
  "wave",
];

export const AVATAR_3D_FALLBACK_CLIP: Avatar3DClipName = "idle";

/** Duración del crossfade entre clips (segundos). */
export const AVATAR_3D_FADE_SECONDS = 0.35;

export function resolveAvatar3DClip(state: AvatarState): Avatar3DClipName {
  return avatarStateToClip[state] ?? AVATAR_3D_FALLBACK_CLIP;
}
