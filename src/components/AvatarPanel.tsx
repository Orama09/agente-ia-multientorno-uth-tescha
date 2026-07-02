"use client";

export default function AvatarPanel() {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      {/* Placeholder Avatar */}
      <div className="relative">
        <div className="w-44 h-44 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold animate-pulse">
          AI
        </div>
        <span className="absolute bottom-2 right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></span>
      </div>

      <h3 className="mt-4 font-semibold">Asistente Virtual TESCHA</h3>
      <p className="text-sm text-gray-500 text-center">
        El avatar estará disponible próximamente
      </p>
    </div>
  );
}