"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { AvatarState } from "@/types/avatar";
import { assistantExperience } from "@/lib/assistant/assistantExperienceConfig";
import { useAvatarController } from "@/lib/avatar/useAvatarController";
import ChatPanel from "./ChatPanel";
import TramitesModal from "./TramitesModal";

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
    <div className="w-full mx-auto" aria-busy="true">
      <div className="relative overflow-hidden bg-[#00b97f] px-3 pt-6 pb-4 min-h-[420px] flex flex-col items-center justify-center">
        <div className="h-9 w-9 rounded-full border-2 border-white border-t-transparent animate-spin" />
        <p className="mt-3 text-xs text-white">Cargando avatar 3D…</p>
      </div>
    </div>
  ),
});

/**
 * Selecciona el renderer según avatarProvider.
 *
 * Hidratación segura:
 * - Servidor y primer paint del cliente siempre renderizan el estado de carga.
 */
function AvatarExperienceRenderer({
  avatarState,
}: {
  avatarState: AvatarState;
}) {
  const [mounted, setMounted] = useState(false);
  const [hasFatalError, setHasFatalError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  // SSR + hidratación: estructura idéntica
    if (!mounted) {
    return (
      <div className="w-full mx-auto" aria-busy="true">
        <div className="relative overflow-hidden bg-[#C5A853] px-3 pt-6 pb-4 min-h-[420px] flex flex-col items-center justify-center">
          <div className="h-9 w-9 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <p className="mt-3 text-xs text-white">Cargando avatar 3D…</p>
        </div>
      </div>
    );
  }

  if (hasFatalError) {
    return (
      <div className="w-full mx-auto flex items-center justify-center min-h-[300px] bg-[#C5A853]">
        <p className="text-xs text-white px-3 text-center">
          El avatar no está disponible en este momento.
        </p>
      </div>
    );
  }

  return (
    <Avatar3DPanel
      avatarState={avatarState}
      showStatusLabel={false} // 🔧 Oculta texto debajo del avatar
      onFatalError={(error) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[AvatarExperience] Fallo Avatar3DPanel:", error);
        }
        setHasFatalError(true);
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
  const [tramitesOpen, setTramitesOpen] = useState(false);

  return (
    <div
      className={`flex flex-col h-full min-h-0 overflow-hidden bg-transparent ${className ?? ""}`}
    >
      {/* 🔧 Contenedor superior del avatar sin márgenes ni borde */}
      <div className="shrink-0 z-10 w-full bg-[#ebf2f0]">
        <AvatarExperienceRenderer avatarState={avatarState} />
        <button
          onClick={() => setTramitesOpen(true)}
          className="w-full text-sm font-medium text-white bg-[#0f6b4c] py-2 hover:bg-[#0c5a3f] transition-colors"
        >
          📄 Solicitar trámite / consultar estatus
        </button>
      </div>

      {/* overflow-hidden: el scroll vive solo en ChatPanel (mensajes), no aquí ni en la página */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatPanel onAvatarStateChange={requestAvatarState} />
      </div>

      <TramitesModal open={tramitesOpen} onClose={() => setTramitesOpen(false)} />
    </div>
  );
}
