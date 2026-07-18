"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AvatarState } from "@/types/avatar";
import {
  AVATAR_FADE_MS,
  getAllAvatarFrameSrcs,
  getAvatarStateConfig,
} from "@/lib/avatar/avatarConfig";

type AvatarPanelProps = {
  avatarState?: AvatarState;
  /** Mostrar el label descriptivo bajo el título. Default: true */
  showStatusLabel?: boolean;
};

/**
 * Vista del avatar para el proveedor "local-images".
 *
 * Recibe solo `avatarState` (contrato compartido). Frames, rotación, labels
 * y alt viven en avatarConfig — no hardcodear rutas aquí.
 *
 * Sustituible por Avatar3DPanel / RiveAvatarPanel / LiveAvatarPanel
 * manteniendo la misma prop `avatarState`.
 */
export default function AvatarPanel({
  avatarState = "idle",
  showStatusLabel = true,
}: AvatarPanelProps) {
  const config = getAvatarStateConfig(avatarState);
  const frames = config.frames;

  const [frameIndex, setFrameIndex] = useState(0);

  // Capa A/B para crossfade sin hueco en blanco
  const [layerA, setLayerA] = useState(frames[0]);
  const [layerB, setLayerB] = useState(frames[0]);
  const [showA, setShowA] = useState(true);
  const displayedSrcRef = useRef(frames[0]);
  const activeIsARef = useRef(true);

  // Precarga de frames en cliente (no corre en SSR)
  useEffect(() => {
    const srcs = getAllAvatarFrameSrcs();
    for (const src of srcs) {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  // Reiniciar frame al cambiar de estado
  useEffect(() => {
    setFrameIndex(0);
  }, [avatarState]);

  // Rotación automática
  useEffect(() => {
    const { rotationMs, frames: stateFrames } =
      getAvatarStateConfig(avatarState);

    if (rotationMs === null || stateFrames.length <= 1) return;

    const id = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % stateFrames.length);
    }, rotationMs);

    return () => window.clearInterval(id);
  }, [avatarState]);

  const targetSrc = frames[frameIndex] ?? frames[0];

  // Crossfade: la capa oculta recibe el nuevo src y luego se revela
  useEffect(() => {
    if (targetSrc === displayedSrcRef.current) return;

    displayedSrcRef.current = targetSrc;

    if (activeIsARef.current) {
      setLayerB(targetSrc);
      setShowA(false);
      activeIsARef.current = false;
    } else {
      setLayerA(targetSrc);
      setShowA(true);
      activeIsARef.current = true;
    }
  }, [targetSrc]);

  return (
    <section
      className="w-full max-w-md mx-auto"
      aria-label="Escenario del avatar del asistente"
    >
      {/* Escenario institucional */}
      <div
        className="
          relative overflow-hidden rounded-2xl
          border border-gray-200/80
          bg-gradient-to-b from-white via-gray-50 to-emerald-50/40
          shadow-sm
          px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3
        "
      >
        {/* Brillo suave superior (atmósfera, no decoración agresiva) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-emerald-100/30 to-transparent"
          aria-hidden
        />

        {/* Contenedor de imagen con altura estable */}
        <div
          className="
            relative z-[1] mx-auto
            h-44 w-full max-w-[11.5rem]
            sm:h-52 sm:max-w-[13.5rem]
            lg:h-56 lg:max-w-[15rem]
          "
        >
          <Image
            src={layerA}
            alt={config.alt}
            fill
            sizes="(max-width: 640px) 184px, (max-width: 1024px) 216px, 240px"
            className="object-contain object-bottom drop-shadow-md transition-opacity ease-in-out"
            style={{
              opacity: showA ? 1 : 0,
              transitionDuration: `${AVATAR_FADE_MS}ms`,
            }}
            priority
          />
          <Image
            src={layerB}
            alt=""
            fill
            sizes="(max-width: 640px) 184px, (max-width: 1024px) 216px, 240px"
            className="object-contain object-bottom drop-shadow-md transition-opacity ease-in-out"
            style={{
              opacity: showA ? 0 : 1,
              transitionDuration: `${AVATAR_FADE_MS}ms`,
            }}
            aria-hidden
          />
        </div>

        {/* Pie del escenario: título + estado */}
        <div className="relative z-[1] mt-2 text-center min-h-[2.75rem] sm:min-h-[3rem]">
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-gray-800">
            Asistente Virtual TESCHA
          </h3>

          {showStatusLabel && (
            <p
              className="mt-0.5 text-[11px] sm:text-xs text-gray-500 leading-snug transition-opacity duration-200"
              aria-live="polite"
            >
              {config.label}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
