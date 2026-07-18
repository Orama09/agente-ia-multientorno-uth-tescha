"use client";

import {
  Component,
  Suspense,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import type { AvatarState } from "@/types/avatar";
import { getAvatarStateConfig } from "@/lib/avatar/avatarConfig";
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
  /** Si falla la carga WebGL/GLB, el padre puede volver a local-image. */
  onFatalError?: (error?: unknown) => void;
};

function StageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        relative overflow-hidden rounded-2xl
        border border-gray-200/80
        bg-gradient-to-b from-white via-gray-50 to-emerald-50/40
        shadow-sm
        px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3
      "
    >
      {children}
    </div>
  );
}

function CanvasLoader() {
  return (
    <Html center>
      <div className="h-9 w-9 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
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
 * Recibe solo `avatarState` — mismo contrato que AvatarPanel.
 * Debe cargarse con dynamic(..., { ssr: false }).
 */
export default function Avatar3DPanel({
  avatarState = "idle",
  showStatusLabel = true,
  onFatalError,
}: Avatar3DPanelProps) {
  const config = getAvatarStateConfig(avatarState);

  return (
    <section
      className="w-full max-w-md mx-auto"
      aria-label="Escenario 3D del avatar del asistente"
    >
      <StageShell>
        <div
          className="
            relative z-[1] mx-auto
            h-44 w-full max-w-[11.5rem]
            sm:h-52 sm:max-w-[13.5rem]
            lg:h-56 lg:max-w-[15rem]
          "
        >
          <Avatar3DErrorBoundary
            onError={(error) => onFatalError?.(error)}
            fallback={
              <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
                <p className="text-xs text-gray-500">
                  No se pudo cargar el avatar 3D
                </p>
              </div>
            }
          >
            <Canvas
              className="absolute inset-0 !h-full !w-full touch-none"
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
                <Avatar3DModel avatarState={avatarState} />
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
        </div>

        <div className="relative z-[1] mt-2 text-center min-h-[2.75rem] sm:min-h-[3rem]">
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-gray-800">
            Asistente Virtual TESCHA
          </h3>
          {showStatusLabel && (
            <p
              className="mt-0.5 text-[11px] sm:text-xs text-gray-500 leading-snug"
              aria-live="polite"
            >
              {config.label}
            </p>
          )}
        </div>
      </StageShell>
    </section>
  );
}
