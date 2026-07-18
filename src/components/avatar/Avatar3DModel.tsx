"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import type { AvatarState } from "@/types/avatar";
import {
  AVATAR_3D_FADE_SECONDS,
  AVATAR_3D_FALLBACK_CLIP,
  AVATAR_3D_MODEL_PATH,
  AVATAR_3D_MODEL_POSITION,
  AVATAR_3D_MODEL_ROTATION,
  AVATAR_3D_MODEL_SCALE,
  resolveAvatar3DClip,
} from "@/lib/avatar/avatar3DConfig";

type Avatar3DModelProps = {
  avatarState: AvatarState;
};

/**
 * Modelo GLB + animaciones. Solo montar dentro de un Canvas R3F (cliente).
 * Escala/posición/rotación viven en avatar3DConfig.
 */
export default function Avatar3DModel({ avatarState }: Avatar3DModelProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(AVATAR_3D_MODEL_PATH);
  const { actions, names } = useAnimations(animations, group);
  const currentClipRef = useRef<string | null>(null);

  const clipNameSet = useMemo(() => new Set(names), [names]);

  useEffect(() => {
    const desired = resolveAvatar3DClip(avatarState);
    const clip =
      clipNameSet.has(desired)
        ? desired
        : clipNameSet.has(AVATAR_3D_FALLBACK_CLIP)
          ? AVATAR_3D_FALLBACK_CLIP
          : names[0] ?? null;

    if (!clip) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Avatar3DModel] El GLB no contiene clips de animación.",
          { desired, names },
        );
      }
      return;
    }

    if (desired !== clip && process.env.NODE_ENV === "development") {
      console.warn(
        `[Avatar3DModel] Clip "${desired}" no encontrado; usando "${clip}".`,
        { available: names },
      );
    }

    const nextAction = actions[clip];
    if (!nextAction) return;

    const prevClip = currentClipRef.current;
    if (prevClip === clip) {
      if (!nextAction.isRunning()) {
        nextAction.reset().fadeIn(AVATAR_3D_FADE_SECONDS).play();
      }
      return;
    }

    const prevAction = prevClip ? actions[prevClip] : undefined;
    if (prevAction?.isRunning()) {
      prevAction.fadeOut(AVATAR_3D_FADE_SECONDS);
    }

    nextAction.reset().fadeIn(AVATAR_3D_FADE_SECONDS).play();
    currentClipRef.current = clip;
  }, [actions, avatarState, clipNameSet, names]);

  return (
    <group
      ref={group}
      dispose={null}
      position={AVATAR_3D_MODEL_POSITION}
      rotation={AVATAR_3D_MODEL_ROTATION}
      scale={AVATAR_3D_MODEL_SCALE}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(AVATAR_3D_MODEL_PATH);
