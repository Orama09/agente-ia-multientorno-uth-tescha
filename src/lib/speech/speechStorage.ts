/** Claves de preferencias de voz (cliente). SSR-safe: solo leer/escribir en window. */

export const SPEECH_STORAGE_KEYS = {
  enabled: "ai-avatar.voice.enabled",
  voiceUri: "ai-avatar.voice.uri",
  rate: "ai-avatar.voice.rate",
} as const;

export const SPEECH_RATES = [0.8, 1, 1.2] as const;
export type SpeechRate = (typeof SPEECH_RATES)[number];

export function isSpeechRate(value: number): value is SpeechRate {
  return (SPEECH_RATES as readonly number[]).includes(value);
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readSpeechStorageBool(
  key: string,
): boolean | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeSpeechStorageBool(key: string, value: boolean): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // quota / private mode
  }
}

export function readSpeechStorageString(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSpeechStorageString(key: string, value: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function readSpeechStorageRate(key: string): SpeechRate | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const num = Number.parseFloat(raw);
    return isSpeechRate(num) ? num : null;
  } catch {
    return null;
  }
}

export function writeSpeechStorageRate(key: string, value: SpeechRate): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}
