import React from "react";
import { Settings, History } from "lucide-react";
import useUiStore from "@/common/store/uiStore";

export function SoccerGameControlButton() {
  const currentScene = useUiStore((state) => state.currentScene);
  const openModal = useUiStore((state) => state.openSoccerGameControlModal);
  const openHistory = useUiStore((state) => state.openMatchHistoryModal);

  // Only show in SoccerMap
  if (currentScene !== "SoccerMap") return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2">
        <button
        onClick={openModal}
        className="w-12 h-12 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm"
        title="Game Control"
        >
        <Settings size={20} className="text-amber-500" />
        </button>

        <button
        onClick={openHistory}
        className="w-12 h-12 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm"
        title="Match History"
        >
        <History size={20} className="text-amber-500" />
        </button>
    </div>
  );
}
