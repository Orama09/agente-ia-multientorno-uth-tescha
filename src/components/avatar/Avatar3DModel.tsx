"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { MathUtils, type Group, type Mesh } from "three";
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
  /** true mientras el mouse está sobre el panel del avatar. */
  isHovered?: boolean;
};

// 👇 Ángulos máximos de giro al seguir el cursor (radianes).
// ~20° de izquierda a derecha, ~7° de arriba a abajo — sutil, no exagerado.
const LOOK_MAX_YAW = 0.85;
const LOOK_MAX_PITCH = 0.10;
/** Qué tan rápido "alcanza" al cursor (mayor = más ágil/menos suave). */
const LOOK_LERP_SPEED = 4;

export default function Avatar3DModel({
  avatarState,
  isHovered = false,
}: Avatar3DModelProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(AVATAR_3D_MODEL_PATH);
  const { actions, names } = useAnimations(animations, group);
  const currentClipRef = useRef<string | null>(null);

  // Referencias a la malla y a las posiciones de las Shape Keys de tu modelo
  const meshRef = useRef<Mesh | null>(null);
  const shapeKeysIndicesRef = useRef<{
    abierta?: number;
    cerrada?: number;
    ou?: number;
    dental?: number;
  }>({});

  const clipNameSet = useMemo(() => new Set(names), [names]);

  // Posición/rotación base del modelo — se aplican UNA vez al montar. El
  // seguimiento del cursor se maneja imperativamente en useFrame a partir
  // de aquí, así no hay conflicto entre el prop declarativo de rotation y
  // la mutación por frame.
  useEffect(() => {
    if (!group.current) return;
    group.current.position.set(...AVATAR_3D_MODEL_POSITION);
    group.current.rotation.set(...AVATAR_3D_MODEL_ROTATION);
  }, []);

  // 1. Identificar la malla y mapear las Shape Keys exactas de Blender
  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh && mesh.morphTargetDictionary) {
        meshRef.current = mesh;
        const dict = mesh.morphTargetDictionary;

        shapeKeysIndicesRef.current = {
          abierta: dict["abierta"] ?? dict["boca_abierta"],
          cerrada: dict["cerrada"] ?? dict["boca_cerrada"],
          ou: dict["ou"] ?? dict["redonda_ou"],
          dental: dict["dental"],
        };
      }
    });
  }, [scene]);

  // 2. Control de Clips de Animación (Esqueleto/Cuerpo)
  useEffect(() => {
    const desired = resolveAvatar3DClip(avatarState);
    const clip = clipNameSet.has(desired)
      ? desired
      : clipNameSet.has(AVATAR_3D_FALLBACK_CLIP)
        ? AVATAR_3D_FALLBACK_CLIP
        : names[0] ?? null;

    if (!clip) return;

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

  // 3. Modificación dinámica y natural de las Shape Keys de la boca
  //    + seguimiento del cursor con la cabeza/cuerpo (grupo completo).
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const keys = shapeKeysIndicesRef.current;

    // --- Seguir al cursor ---
    if (group.current) {
      const [baseX, baseY] = AVATAR_3D_MODEL_ROTATION;

      // state.pointer: coordenadas normalizadas del mouse sobre el canvas
      // (-1 a 1). R3F las actualiza solo mientras el mouse está encima del
      // <Canvas>; por eso combinamos con isHovered para saber cuándo volver
      // suavemente al centro.
      const targetYaw = isHovered ? baseY + state.pointer.x * LOOK_MAX_YAW : baseY;
      const targetPitch = isHovered
        ? baseX - state.pointer.y * LOOK_MAX_PITCH
        : baseX;

      group.current.rotation.y = MathUtils.lerp(
        group.current.rotation.y,
        targetYaw,
        Math.min(1, delta * LOOK_LERP_SPEED),
      );
      group.current.rotation.x = MathUtils.lerp(
        group.current.rotation.x,
        targetPitch,
        Math.min(1, delta * LOOK_LERP_SPEED),
      );
    }

    // --- Boca ---
    if (!mesh || !mesh.morphTargetInfluences) return;

    if (avatarState === "speaking") {
      // --- Ciclo de "sílabas": en vez de 4 ondas independientes compitiendo,
      // usamos un ciclo 0→1 repetido donde cada shape key domina una franja
      // (segmento) con una curva de subida/bajada suave (seno), y los
      // segmentos se solapan un poco para que la transición entre una forma
      // y la siguiente sea gradual, no un salto. Así se ven coordinadas
      // ("en armonía") en vez de superpuestas al azar.
      //
      // 'ou' tiene un segmento más ancho (0.34 vs ~0.24 de las demás) para
      // que se sostenga más tiempo, tal como se pidió.
      const cycleSpeed = 0.095; // más bajo = sílabas más largas/lentas
      // variación lenta de velocidad/intensidad para que no se sienta 100% repetitivo
      const rhythmMod = 0.85 + 0.3 * Math.sin(state.clock.elapsedTime * 0.17);
      const phase = (state.clock.elapsedTime * cycleSpeed * rhythmMod) % 1;

      const segmentWeight = (start: number, end: number, peak: number) => {
        if (phase < start || phase > end) return 0;
        const local = (phase - start) / (end - start);
        return Math.sin(Math.PI * local) * peak; // 0 -> peak -> 0, suave
      };

      const targetAbierta = segmentWeight(0.0, 0.26, 0.85);
      const targetOu = segmentWeight(0.2, 0.54, 0.7); // segmento ancho: dura más
      const targetDental = segmentWeight(0.48, 0.72, 0.5);
      const targetCerrada = segmentWeight(0.68, 1.0, 0.4);

      // Aplicamos lerp suave a las cuatro Shape Keys
      if (keys.abierta !== undefined) {
        mesh.morphTargetInfluences[keys.abierta] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.abierta],
          targetAbierta,
          delta * 7
        );
      }

      if (keys.ou !== undefined) {
        mesh.morphTargetInfluences[keys.ou] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.ou],
          targetOu,
          delta * 7
        );
      }

      if (keys.dental !== undefined) {
        mesh.morphTargetInfluences[keys.dental] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.dental],
          targetDental,
          delta * 7
        );
      }

      if (keys.cerrada !== undefined) {
        mesh.morphTargetInfluences[keys.cerrada] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.cerrada],
          targetCerrada,
          delta * 8
        );
      }
    } else {
      // Regresa las Shape Keys pausadamente al estado de reposo
      if (keys.abierta !== undefined) {
        mesh.morphTargetInfluences[keys.abierta] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.abierta],
          0.0,
          delta * 6
        );
      }

      if (keys.ou !== undefined) {
        mesh.morphTargetInfluences[keys.ou] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.ou],
          0.0,
          delta * 6
        );
      }

      if (keys.dental !== undefined) {
        mesh.morphTargetInfluences[keys.dental] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.dental],
          0.0,
          delta * 6
        );
      }

      if (keys.cerrada !== undefined) {
        mesh.morphTargetInfluences[keys.cerrada] = MathUtils.lerp(
          mesh.morphTargetInfluences[keys.cerrada],
          0.0,
          delta * 6
        );
      }
    }
  });

  return (
    <group ref={group} dispose={null} scale={AVATAR_3D_MODEL_SCALE}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(AVATAR_3D_MODEL_PATH);
