import React from "react";
import useUiStore from "@/common/store/uiStore";

export default function PingDisplay() {
    const ping = useUiStore((state) => state.ping);

    if (ping === null) return null;

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
