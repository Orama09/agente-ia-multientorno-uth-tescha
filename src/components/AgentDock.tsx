import AvatarPanel from "./AvatarPanel";
import ChatPanel from "./ChatPanel";

type AgentDockProps = {
  className?: string;
};

export default function AgentDock({ className }: AgentDockProps) {
  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className ?? ""}`}>

      {/* AVATAR */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b p-4 flex justify-center">
        <AvatarPanel />
      </div>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <ChatPanel />
      </div>

    </div>
  );
}