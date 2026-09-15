import type { AvatarState } from "@/types/avatar";

/**
 * Configuración del proveedor experimental threejs.
 *
 * Modelo: public/models/avatar/tescha_avatar_final.glb
 * Activación: NEXT_PUBLIC_AVATAR_PROVIDER=threejs
 *
 * Calibración visual: ajustar modelPosition / modelScale / camera* aquí
 * (no hardcodear en los componentes).
 */

export type Vec3 = readonly [number, number, number];

export const AVATAR_3D_MODEL_PATH = "/models/avatar/tescha_avatar_final.glb";

/** Transform del modelo en escena. [x, y, z] — subir/bajar = cambiar Y. */
export const AVATAR_3D_MODEL_POSITION: Vec3 = [0, 0.2, 0];
export const AVATAR_3D_MODEL_SCALE = 2.2;
/** Yaw: 0 = frontal; Math.PI = girar 180° si aparece de espalda. */
export const AVATAR_3D_MODEL_ROTATION: Vec3 = [0, 0, 0];

/**
 * Cámara frontal — encuadre de busto (cabeza + hombros/torso superior).
 *
 * 👇 ACERCADA respecto a la versión original ([0,1.0,3.5], fov 30, target
 * [0,0.9,0], que mostraba el cuerpo casi completo). Se subió el target/Y de
 * la cámara y se redujo la distancia + FOV para permitir una caja (StageShell)
 * más baja SIN que el avatar se vea más chico — ahora se ve menos cuerpo,
 * pero lo que se ve (cabeza/torso) ocupa proporcionalmente el mismo espacio
 * en pantalla, gracias al acercamiento.
 *
 * Si se ve MUY encimado o cortado (ej. se corta la cabeza arriba), subir
 * un poco AVATAR_3D_CAMERA_POSITION[2] (alejar) o subir el FOV. Si se ve
 * muy alejado/pequeño todavía, bajar más esos valores.
 */
export const AVATAR_3D_CAMERA_POSITION: Vec3 = [0, 1.0, 2.8];
export const AVATAR_3D_CAMERA_FOV = 28;
export const AVATAR_3D_CAMERA_TARGET: Vec3 = [0, 0.7, 0];

/** Luces */
export const AVATAR_3D_AMBIENT_INTENSITY = 1.4;
export const AVATAR_3D_KEY_LIGHT = {
  position: [3, 5, 4] as Vec3,
  intensity: 2.2,
};
export const AVATAR_3D_FILL_LIGHT = {
  position: [-3, 3, 3] as Vec3,
  intensity: 1.4,
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
export const AVATAR_3D_DISABLE_ORBIT_BELOW_PX = 768;

/** Nombres de clips esperados dentro del GLB. */
export const AVATAR_3D_CLIP_NAMES = [
  "idle",
  "thinking",
  "speaking",
  "happy",
  "error",
  "listening",
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

export const AVATAR_3D_FALLBACK_CLIP: Avatar3DClipName = "idle";

/** Duración del crossfade entre clips (segundos). */
export const AVATAR_3D_FADE_SECONDS = 0.35;

/** Mínimo de tiempo en thinking antes de permitir speaking. */
export const AVATAR_MIN_THINKING_MS = 800;

/** Duración del estado happy tras una respuesta exitosa. */
export const AVATAR_HAPPY_DURATION_MS = 1500;

/** Tiempo en error antes de volver a idle. */
export const AVATAR_ERROR_RECOVERY_MS = 3000;

export function resolveAvatar3DClip(state: AvatarState): Avatar3DClipName {
  return avatarStateToClip[state] ?? AVATAR_3D_FALLBACK_CLIP;
}