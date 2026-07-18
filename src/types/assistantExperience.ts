/**
 * Contrato de experiencia del asistente (avatar visual + TTS).
 *
 * Independiente de RAG/Ollama. AgentDock elige el renderer de avatar;
 * ChatPanel elige el motor TTS según estos tipos.
 *
 * Implementados hoy:
 *   - avatar: local-image | threejs (experimental)
 *   - tts: none | web-speech
 *
 * Reservados (arquitectura futura, no implementados):
 *   - avatar: rive | live2d | liveavatar
 *   - tts: external (ElevenLabs / Azure / OpenAI / etc.)
 */

export const AVATAR_PROVIDERS = [
  "local-image",
  "threejs",
  "rive",
  "live2d",
  "liveavatar",
] as const;

export type AvatarProvider = (typeof AVATAR_PROVIDERS)[number];

/** Proveedores de avatar con renderer real en el código. */
export const IMPLEMENTED_AVATAR_PROVIDERS = ["local-image", "threejs"] as const;
export type ImplementedAvatarProvider =
  (typeof IMPLEMENTED_AVATAR_PROVIDERS)[number];

export const TTS_PROVIDERS = ["none", "web-speech", "external"] as const;
export type TtsProvider = (typeof TTS_PROVIDERS)[number];

/** Proveedores TTS con motor real en el código. */
export const IMPLEMENTED_TTS_PROVIDERS = ["none", "web-speech"] as const;
export type ImplementedTtsProvider = (typeof IMPLEMENTED_TTS_PROVIDERS)[number];

export type AssistantExperienceConfig = {
  avatarProvider: AvatarProvider;
  ttsProvider: TtsProvider;
  voiceEnabledByDefault: boolean;
};
