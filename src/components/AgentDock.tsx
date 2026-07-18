"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { AvatarState } from "@/types/avatar";
import { assistantExperience } from "@/lib/assistant/assistantExperienceConfig";
import { useAvatarController } from "@/lib/avatar/useAvatarController";
import AvatarPanel from "./AvatarPanel";
import ChatPanel from "./ChatPanel";

type AgentDockProps = {
  className?: string;
};

/**
 * Chunk 3D solo en cliente. No usar como primer render (hydration).
 * Se monta únicamente después de `mounted === true`.
 */
const Avatar3DPanel = dynamic(() => import("./avatar/Avatar3DPanel"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-md mx-auto" aria-busy="true">
      <div
        className="
          relative overflow-hidden rounded-2xl
          border border-gray-200/80
          bg-gradient-to-b from-white via-gray-50 to-emerald-50/40
          shadow-sm
          px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3
        "
      >
        <div className="relative mx-auto h-44 sm:h-52 lg:h-56 flex items-center justify-center">
          <div className="h-9 w-9 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        </div>
        <div className="mt-2 text-center min-h-[2.75rem] sm:min-h-[3rem]">
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-gray-800">
            Asistente Virtual TESCHA
          </h3>
          <p className="mt-0.5 text-[11px] sm:text-xs text-gray-500">
            Cargando avatar 3D…
          </p>
        </div>
      </div>
    </div>
  ),
});

/**
 * Selecciona el renderer según avatarProvider.
 *
 * Hidratación segura:
 * - Servidor y primer paint del cliente siempre renderizan AvatarPanel.
 * - Tras montar, si provider === "threejs", se carga Avatar3DPanel.
 */
function AvatarExperienceRenderer({
  avatarState,
}: {
  avatarState: AvatarState;
}) {
  const [mounted, setMounted] = useState(false);
  const [forceLocalImage, setForceLocalImage] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wantsThreeJs =
    !forceLocalImage && assistantExperience.avatarProvider === "threejs";

  // SSR + hidratación: estructura idéntica
  if (!mounted || !wantsThreeJs) {
    return <AvatarPanel avatarState={avatarState} />;
  }

  return (
    <Avatar3DPanel
      avatarState={avatarState}
      onFatalError={(error) => {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[AvatarExperience] Fallo Avatar3DPanel → fallback local-image:",
            error,
          );
        }
        setForceLocalImage(true);
      }}
    />
  );
}

/**
 * Dueño de AvatarState. Aplica timings/anti-carreras vía useAvatarController
 * y reparte el estado al renderer (según proveedor) y el emisor (ChatPanel).
 */
export default function AgentDock({ className }: AgentDockProps) {
  const { avatarState, requestAvatarState } = useAvatarController("idle");

  return (
    <div className={`flex flex-col h-full min-h-0 bg-gray-50 ${className ?? ""}`}>
      <div className="shrink-0 sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3 flex justify-center">
        <AvatarExperienceRenderer avatarState={avatarState} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
        <ChatPanel onAvatarStateChange={requestAvatarState} />
      </div>
    </div>
  );
}
