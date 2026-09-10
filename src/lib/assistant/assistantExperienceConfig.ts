import type {
  AssistantExperienceConfig,
  AvatarProvider,
  TtsProvider,
} from "@/types/assistantExperience";
import {
  AVATAR_PROVIDERS,
  IMPLEMENTED_AVATAR_PROVIDERS,
  IMPLEMENTED_TTS_PROVIDERS,
  TTS_PROVIDERS,
} from "@/types/assistantExperience";

/**
 * Configuración pública de experiencia (avatar + voz).
 *
 * IMPORTANTE (Next.js): las variables NEXT_PUBLIC_* usadas en el cliente
 * deben leerse con acceso estático directo:
 *   process.env.NEXT_PUBLIC_AVATAR_PROVIDER
 * No usar process.env[key] — el bundler no las inyecta en el cliente.
 *
 * Variables:
 *   NEXT_PUBLIC_AVATAR_PROVIDER=threejs|rive|live2d|liveavatar
 *   NEXT_PUBLIC_TTS_PROVIDER=none|web-speech|external
 *   NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=true|false
 *
 * Implementados avatar: threejs (experimental).
 */

const DEFAULT_AVATAR: AvatarProvider = "threejs";
const DEFAULT_TTS: TtsProvider = "web-speech";
const DEFAULT_VOICE_ENABLED = false;

/** Normaliza string de env (trim; vacío → undefined). */
function normalizeEnv(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

function isAvatarProvider(value: string): value is AvatarProvider {
  return (AVATAR_PROVIDERS as readonly string[]).includes(value);
}

function isTtsProvider(value: string): value is TtsProvider {
  return (TTS_PROVIDERS as readonly string[]).includes(value);
}

function isImplementedAvatar(
  value: AvatarProvider,
): value is (typeof IMPLEMENTED_AVATAR_PROVIDERS)[number] {
  return (IMPLEMENTED_AVATAR_PROVIDERS as readonly string[]).includes(value);
}

function isImplementedTts(
  value: TtsProvider,
): value is (typeof IMPLEMENTED_TTS_PROVIDERS)[number] {
  return (IMPLEMENTED_TTS_PROVIDERS as readonly string[]).includes(value);
}

function resolveAvatarProvider(raw: string | undefined): AvatarProvider {
  if (raw === undefined) return DEFAULT_AVATAR;

  const normalized = raw.toLowerCase();

  const aliases: Record<string, AvatarProvider> = {
    "three-d": "threejs",
    "three-js": "threejs",
    "live-avatar": "liveavatar",
  };

  const candidate = aliases[normalized] ?? normalized;

  if (!isAvatarProvider(candidate)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[assistantExperience] NEXT_PUBLIC_AVATAR_PROVIDER="${raw}" no reconocido; usando "${DEFAULT_AVATAR}".`,
      );
    }
    return DEFAULT_AVATAR;
  }

  if (!isImplementedAvatar(candidate)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[assistantExperience] Avatar provider "${candidate}" reservado (aún no implementado); usando "${DEFAULT_AVATAR}".`,
      );
    }
    return DEFAULT_AVATAR;
  }

  return candidate;
}

function resolveTtsProvider(raw: string | undefined): TtsProvider {
  if (raw === undefined) return DEFAULT_TTS;

  const normalized = raw.toLowerCase();
  const aliases: Record<string, TtsProvider> = {
    webspeech: "web-speech",
    web_speech: "web-speech",
    browser: "web-speech",
    off: "none",
    disabled: "none",
  };

  const candidate = aliases[normalized] ?? normalized;

  if (!isTtsProvider(candidate)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[assistantExperience] NEXT_PUBLIC_TTS_PROVIDER="${raw}" no reconocido; usando "${DEFAULT_TTS}".`,
      );
    }
    return DEFAULT_TTS;
  }

  if (!isImplementedTts(candidate)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[assistantExperience] TTS provider "${candidate}" reservado (aún no implementado); usando "${DEFAULT_TTS}".`,
      );
    }
    return DEFAULT_TTS;
  }

  return candidate;
}

function loadAssistantExperience(): AssistantExperienceConfig {
  // Acceso estático obligatorio para inlining en el bundle del cliente
  const rawAvatar = normalizeEnv(process.env.NEXT_PUBLIC_AVATAR_PROVIDER);
  const rawTts = normalizeEnv(process.env.NEXT_PUBLIC_TTS_PROVIDER);
  const rawVoiceDefault = normalizeEnv(
    process.env.NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT,
  );

  return {
    avatarProvider: resolveAvatarProvider(rawAvatar),
    ttsProvider: resolveTtsProvider(rawTts),
    voiceEnabledByDefault: parseBool(rawVoiceDefault, DEFAULT_VOICE_ENABLED),
  };
}

/** Configuración resuelta en tiempo de módulo (segura ante env inválido). */
export const assistantExperience: AssistantExperienceConfig =
  loadAssistantExperience();

export function isWebSpeechTtsEnabled(
  config: AssistantExperienceConfig = assistantExperience,
): boolean {
  return config.ttsProvider === "web-speech";
}
