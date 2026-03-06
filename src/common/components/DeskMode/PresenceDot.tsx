import React from "react";
import { usePresenceStore } from "@/common/store/presenceStore";

interface PresenceDotProps {
    userId: number;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
}

// Dot sizes tuned to ~30% of avatar diameter, with ring cutout effect
// Avatar sizes: xs=28px, sm=32px, md=36px, lg=40px, xl=64px
const DOT_CONFIG = {
    xs: { dot: "h-2.5 w-2.5", ring: "ring-[2.5px]", pos: "-bottom-[1px] -right-[1px]" },
    sm: { dot: "h-3 w-3", ring: "ring-[2.5px]", pos: "-bottom-[1px] -right-[1px]" },
    md: { dot: "h-3 w-3", ring: "ring-[3px]", pos: "-bottom-[2px] -right-[2px]" },
    lg: { dot: "h-3.5 w-3.5", ring: "ring-[3px]", pos: "-bottom-[2px] -right-[2px]" },
    xl: { dot: "h-4 w-4", ring: "ring-[3.5px]", pos: "-bottom-[2px] -right-[2px]" },
};

export default function PresenceDot({ userId, size = "xs" }: PresenceDotProps) {
    const presence = usePresenceStore((s) => s.presenceMap[userId]);
    const color = presence?.color ?? "#71717a";
    const config = DOT_CONFIG[size];

    return (
        <span
            className={`absolute ${config.pos} block rounded-full ${config.dot} ${config.ring} ring-[var(--wd-surface-panel)]`}
            style={{ backgroundColor: color }}
        />
    );
}
