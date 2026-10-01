import React from "react";
import useUiStore from "@/common/store/uiStore";
import { useMediaQuery } from "@/common/hooks/useMediaQuery";

export default function PingDisplay() {
    const ping = useUiStore((state) => state.ping);
    const interactionMode = useUiStore((state) => state.interactionMode);
    const isChatWindowOpen = useUiStore((state) => state.isChatWindowOpen);
    // Below `lg` the chat drawer reaches the left edge, so this badge would
    // sit on top of the drawer's header buttons.
    const isBelowLg = useMediaQuery("(max-width: 1023px)");

    if (ping === null || interactionMode === "desk") return null;
    if (isChatWindowOpen && isBelowLg) return null;

    const getPingColor = (p: number) => {
        if (p < 100) return "text-green-400";
        if (p < 200) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="fixed top-4 left-4 z-50 pointer-events-none select-none">
            <div className="bg-black/40 backdrop-blur-sm px-2 py-1 rounded border border-white/10 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ping < 150 ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                <span className={`text-xs font-mono font-bold ${getPingColor(ping)}`}>
                    {ping}ms
                </span>
            </div>
        </div>
    );
}
