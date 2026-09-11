"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  AVATAR_3D_AUTO_RESET_DELAY_MS,
  AVATAR_3D_CAMERA_POSITION,
  AVATAR_3D_CAMERA_TARGET,
  AVATAR_3D_DAMPING_FACTOR,
  AVATAR_3D_DISABLE_ORBIT_BELOW_PX,
  AVATAR_3D_ENABLE_AUTO_RESET,
  AVATAR_3D_ENABLE_DAMPING,
  AVATAR_3D_ENABLE_USER_ORBIT,
  AVATAR_3D_RESET_LERP_SPEED,
} from "@/lib/avatar/avatar3DConfig";

/**
 * OrbitControls con auto-reset suave a la cámara/target iniciales
 * tras un periodo sin interacción. No altera avatarState ni animaciones.
 */
export default function Avatar3DOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const isResettingRef = useRef(false);
  const [orbitAllowed, setOrbitAllowed] = useState(
    AVATAR_3D_ENABLE_USER_ORBIT,
  );

  const initialPosition = useMemo(
    () => new Vector3(...AVATAR_3D_CAMERA_POSITION),
    [],
  );
  const initialTarget = useMemo(
    () => new Vector3(...AVATAR_3D_CAMERA_TARGET),
    [],
  );

  const clearResetTimeout = () => {
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(
      `(max-width: ${AVATAR_3D_DISABLE_ORBIT_BELOW_PX}px)`,
    );
    const sync = () => {
      setOrbitAllowed(AVATAR_3D_ENABLE_USER_ORBIT && !mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.copy(initialTarget);
    controls.object.position.copy(initialPosition);
    controls.update();
    controls.saveState();
  }, [initialPosition, initialTarget]);

  useEffect(() => {
    return () => clearResetTimeout();
  }, []);

  const scheduleAutoReset = () => {
    clearResetTimeout();
    if (!AVATAR_3D_ENABLE_AUTO_RESET) return;

    resetTimeoutRef.current = window.setTimeout(() => {
      isResettingRef.current = true;
      resetTimeoutRef.current = null;
    }, AVATAR_3D_AUTO_RESET_DELAY_MS);
  };

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !isResettingRef.current) return;

    const camera = controls.object;
    const alpha = 1 - Math.exp(-AVATAR_3D_RESET_LERP_SPEED * delta);

    camera.position.lerp(initialPosition, alpha);
    controls.target.lerp(initialTarget, alpha);
    controls.update();

    const posDone = camera.position.distanceToSquared(initialPosition) < 1e-4;
    const targetDone = controls.target.distanceToSquared(initialTarget) < 1e-4;

    if (posDone && targetDone) {
      camera.position.copy(initialPosition);
      controls.target.copy(initialTarget);
      controls.update();
      controls.saveState();
      isResettingRef.current = false;
    }
  });

  if (!AVATAR_3D_ENABLE_USER_ORBIT && !AVATAR_3D_ENABLE_AUTO_RESET) {
    return null;
  }

  return (
    <OrbitControls
      ref={controlsRef}
      target={[...AVATAR_3D_CAMERA_TARGET]}
      enablePan={false}
      enableZoom={false}
      enableRotate={orbitAllowed}
      enableDamping={AVATAR_3D_ENABLE_DAMPING}
      dampingFactor={AVATAR_3D_DAMPING_FACTOR}
      minPolarAngle={Math.PI / 2.8}
      maxPolarAngle={Math.PI / 2.1}
      onStart={() => {
        isResettingRef.current = false;
        clearResetTimeout();
      }}
      onEnd={() => {
        scheduleAutoReset();
      }}
    />
  );
}
