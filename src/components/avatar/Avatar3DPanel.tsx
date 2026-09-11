"use client";

import {
  Component,
  Suspense,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import type { AvatarState } from "@/types/avatar";
import {
  AVATAR_3D_AMBIENT_INTENSITY,
  AVATAR_3D_CAMERA_FOV,
  AVATAR_3D_CAMERA_POSITION,
  AVATAR_3D_CAMERA_TARGET,
  AVATAR_3D_FILL_LIGHT,
  AVATAR_3D_KEY_LIGHT,
  AVATAR_3D_SHADOW_POSITION,
} from "@/lib/avatar/avatar3DConfig";
import Avatar3DModel from "./Avatar3DModel";
import Avatar3DOrbitControls from "./Avatar3DOrbitControls";

type Avatar3DPanelProps = {
  avatarState?: AvatarState;
  showStatusLabel?: boolean;
  /** Si falla la carga WebGL/GLB, el padre debe mostrar un estado alterno. */
  onFatalError?: (error?: unknown) => void;
};

/** 🔧 Contenedor visual del escenario 3D */

function StageShell({ children }: { children: ReactNode }) {
  return (
    // 1. Alto del contenedor — REDUCIDO respecto a la versión anterior
    // (450px/400px → 340px/300px). Esto ya NO achica al avatar porque la
    // cámara en avatar3DConfig.ts se acercó/hizo zoom para compensar
    // (encuadre de busto en vez de cuerpo completo) — ver ese archivo.
    <div className="relative w-full h-[340px] sm:h-[300px] flex items-center justify-center overflow-hidden bg-transparent">
      {/* 2. Círculo verde de fondo */}
      {/* Recalculado para la nueva caja más chica (340px/300px) — mismo
          tamaño de círculo (280px/300px), centrado con margen para el
          título/logo arriba. */}
      <div className="absolute w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] rounded-full bg-green-500 top-[48%] sm:top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 shadow-lg" />

      {/* 3. Header: título/subtítulo a la izquierda, logo a la derecha.
          Antes eran dos <div absolute> independientes (izquierda/derecha)
          que no sabían cuánto espacio ocupaba el otro — en pantallas
          chicas, al agrandar el logo, se encimaba con el título. Ahora
          es un solo flex row con justify-between: cada lado cede espacio
          al otro (min-w-0 + truncate en el texto, shrink-0 + max-w en el
          logo) y nunca se pisan. */}
      <div className="absolute top-2 inset-x-2 flex items-start justify-between gap-2 z-20">

        {/* LADO IZQUIERDO: Título + Subtítulo */}
        <div className="min-w-0 flex flex-col items-start">
          <h2 className="text-sm sm:text-xs font-black text-gray-800 tracking-wider uppercase text-left leading-tight truncate w-full">
            ASISTENTE VIRTUAL
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-600 font-semibold mt-1 truncate w-full">
            Listo para ayudarte
          </p>
        </div>

        {/* LADO DERECHO: Logo TESCHA */}
        <div className="shrink-0 flex items-start justify-end max-w-[38%] sm:max-w-[160px]">
          <img
            src="/images/loga_tescha.png"
            alt="Logo TESCHA"
            className="h-auto max-h-8 sm:max-h-9 w-auto max-w-full object-contain"
          />
        </div>

      </div>

      {/* Canvas 3D a pantalla completa sobre el círculo */}
      <div className="relative w-full h-full z-10 translate-x-2">
        {children}
      </div>
    </div>
  );
}



function CanvasLoader() {
  return (
    <Html center>
      <div className="h-9 w-9 rounded-full border-2 border-white border-t-transparent animate-spin" />
    </Html>
  );
}

type BoundaryProps = {
  onError?: (error: Error) => void;
  fallback: ReactNode;
  children: ReactNode;
};

type BoundaryState = { hasError: boolean };

class Avatar3DErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Avatar3DPanel] Fallo al renderizar avatar 3D:", error);
    }
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Renderer experimental threejs.
 * Recibe solo `avatarState` como prop de entrada.
 * Debe cargarse con dynamic(..., { ssr: false }).
 */
export default function Avatar3DPanel({
  avatarState = "idle",
  showStatusLabel = false,
  onFatalError,
}: Avatar3DPanelProps) {

  // 👇 Detecta si el mouse está sobre el panel del avatar (todo el
  // escenario, incluida la zona del canvas). Se pasa al modelo 3D para
  // que reaccione (seguir el cursor, animaciones extra, etc).
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section
      className="w-full mx-auto"
      aria-label="Escenario 3D del avatar del asistente"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StageShell>
        <Avatar3DErrorBoundary
          onError={(error) => onFatalError?.(error)}
          fallback={
            <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
              <p className="text-xs text-white">
                No se pudo cargar el avatar 3D
              </p>
            </div>
          }
        >
          <Canvas
            className="w-full h-full touch-none"
            camera={{
              position: [...AVATAR_3D_CAMERA_POSITION],
              fov: AVATAR_3D_CAMERA_FOV,
              near: 0.1,
              far: 50,
            }}
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true, powerPreference: "default" }}
            onCreated={({ gl, camera }) => {
              gl.setClearColor(0x000000, 0);
              camera.lookAt(
                AVATAR_3D_CAMERA_TARGET[0],
                AVATAR_3D_CAMERA_TARGET[1],
                AVATAR_3D_CAMERA_TARGET[2],
              );
            }}
          >
            <ambientLight intensity={AVATAR_3D_AMBIENT_INTENSITY} />
            <hemisphereLight
              intensity={0.35}
              color="#ffffff"
              groundColor="#e8eef0"
            />
            <directionalLight
              position={[...AVATAR_3D_KEY_LIGHT.position]}
              intensity={AVATAR_3D_KEY_LIGHT.intensity}
            />
            <directionalLight
              position={[...AVATAR_3D_FILL_LIGHT.position]}
              intensity={AVATAR_3D_FILL_LIGHT.intensity}
            />

            <Suspense fallback={<CanvasLoader />}>
              <Avatar3DModel avatarState={avatarState} isHovered={isHovered} />
              <ContactShadows
                position={[...AVATAR_3D_SHADOW_POSITION]}
                opacity={0.28}
                scale={5}
                blur={2.2}
                far={2.5}
              />
            </Suspense>

            <Avatar3DOrbitControls />
          </Canvas>
        </Avatar3DErrorBoundary>
      </StageShell>
    </section>
  );
}

