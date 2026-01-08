import React from "react";
import { X, Map as MapIcon, Trophy } from "lucide-react";
import useUiStore from "@/common/store/uiStore";
import { EventBus } from "@/game/EventBus";

export function TeleportForm() {
    const closeCommandPalette = useUiStore(
        (state) => state.closeCommandPalette,
    );

    const handleTeleport = (scene: string) => {
        EventBus.emit("teleport", { scene });
        closeCommandPalette();
    };

    return (
        <div className="bg-neutral-900 rounded-lg shadow-2xl border border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                    Teleport
                </h2>
                <button
                    onClick={() => closeCommandPalette()}
                    className="text-neutral-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <button
                    onClick={() => handleTeleport("MainMap")}
                    className="flex items-center gap-4 p-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors text-left"
                >
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                        <MapIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-white font-medium">Office</div>
                        <div className="text-neutral-400 text-sm">Main workspace and meeting areas</div>
                    </div>
                </button>

                <button
                    onClick={() => handleTeleport("SoccerMap")}
                    className="flex items-center gap-4 p-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors text-left"
                >
                    <div className="p-3 bg-green-500/20 rounded-lg">
                        <Trophy className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <div className="text-white font-medium">Soccer Map</div>
                        <div className="text-neutral-400 text-sm">Mini-game area for soccer matches</div>
                    </div>
                </button>
            </div>
        </div>
    );
}
