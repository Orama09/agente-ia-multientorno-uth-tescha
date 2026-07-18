"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AvatarState, AvatarStateChangeHandler } from "@/types/avatar";
import { isAvatarBusyState } from "@/types/avatar";
import {
  AVATAR_ERROR_RECOVERY_MS,
  AVATAR_HAPPY_DURATION_MS,
  AVATAR_MIN_THINKING_MS,
} from "@/lib/avatar/avatarConfig";

type AvatarController = {
  avatarState: AvatarState;
  requestAvatarState: AvatarStateChangeHandler;
};

/**
 * Orquesta AvatarState con timings y anti-carreras.
 *
 * - thinking: incrementa generación (invalida timeouts viejos) y aplica al instante.
 * - speaking: respeta AVATAR_MIN_THINKING_MS salvo que ya se cumplió.
 * - happy / error: muestra el estado y programa idle; un thinking nuevo cancela el idle.
 * - listening / idle desde mic: no interrumpe thinking/speaking.
 *
 * Compatible con cualquier renderer (imágenes, 3D, Rive, LiveAvatar).
 */
export function useAvatarController(
  initialState: AvatarState = "idle",
): AvatarController {
  const [avatarState, setAvatarState] = useState<AvatarState>(initialState);

  const stateRef = useRef<AvatarState>(initialState);
  const generationRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const thinkingStartedAtRef = useRef<number | null>(null);
  const pendingSpeakingRef = useRef(false);

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const applyState = useCallback((state: AvatarState) => {
    stateRef.current = state;
    setAvatarState(state);
  }, []);

  const scheduleIdle = useCallback(
    (delayMs: number, generation: number) => {
      clearScheduled();
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        if (generationRef.current !== generation) return;
        applyState("idle");
      }, delayMs);
    },
    [applyState, clearScheduled],
  );

  const requestAvatarState = useCallback<AvatarStateChangeHandler>(
    (next) => {
      if (next === "thinking") {
        clearScheduled();
        generationRef.current += 1;
        thinkingStartedAtRef.current = Date.now();
        pendingSpeakingRef.current = false;
        applyState("thinking");
        return;
      }

      if (next === "speaking") {
        // Ya en speaking (p. ej. stream terminó y TTS mantiene el estado)
        if (stateRef.current === "speaking" && !pendingSpeakingRef.current) {
          return;
        }

        const startedAt = thinkingStartedAtRef.current;
        const elapsed = startedAt !== null ? Date.now() - startedAt : AVATAR_MIN_THINKING_MS;
        const remaining = Math.max(0, AVATAR_MIN_THINKING_MS - elapsed);
        const generation = generationRef.current;

        if (remaining > 0) {
          pendingSpeakingRef.current = true;
          clearScheduled();
          timeoutRef.current = window.setTimeout(() => {
            timeoutRef.current = null;
            if (generationRef.current !== generation) return;
            if (!pendingSpeakingRef.current) return;
            pendingSpeakingRef.current = false;
            applyState("speaking");
          }, remaining);
          return;
        }

        pendingSpeakingRef.current = false;
        clearScheduled();
        applyState("speaking");
        return;
      }

      if (next === "happy") {
        clearScheduled();
        pendingSpeakingRef.current = false;
        thinkingStartedAtRef.current = null;
        applyState("happy");
        scheduleIdle(AVATAR_HAPPY_DURATION_MS, generationRef.current);
        return;
      }

      if (next === "error") {
        clearScheduled();
        pendingSpeakingRef.current = false;
        thinkingStartedAtRef.current = null;
        applyState("error");
        scheduleIdle(AVATAR_ERROR_RECOVERY_MS, generationRef.current);
        return;
      }

      if (next === "listening") {
        // No interrumpir una respuesta en curso
        if (isAvatarBusyState(stateRef.current)) return;
        clearScheduled();
        applyState("listening");
        return;
      }

      if (next === "idle") {
        // Mic off / cancel: solo si no hay operación activa
        if (isAvatarBusyState(stateRef.current)) return;
        clearScheduled();
        applyState("idle");
      }
    },
    [applyState, clearScheduled, scheduleIdle],
  );

  useEffect(() => {
    return () => clearScheduled();
  }, [clearScheduled]);

  return { avatarState, requestAvatarState };
}
