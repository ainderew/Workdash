import React from "react";
import { Disc3, PauseCircle } from "lucide-react";
import type { BotCardNowPlayingInfo } from "@/communication/chatV2/_types";
import { formatDuration } from "@/common/utils/formatDuration";

interface NowPlayingInfoCardProps {
    card: BotCardNowPlayingInfo;
}

function sourceLabel(source?: string): string {
    if (source === "soundcloud") return "SoundCloud";
    return "YouTube";
}

export function NowPlayingInfoCard({ card }: NowPlayingInfoCardProps) {
    const isPlaying = card.state === "playing";
    const Icon = isPlaying ? Disc3 : PauseCircle;
    const colorVar = isPlaying ? "var(--wd-success)" : "var(--wd-warning)";
    const statusClass = isPlaying ? "wd-bot-card--success" : "wd-bot-card--warning";

    return (
        <div className={`wd-bot-card ${statusClass} rounded-lg px-3.5 py-2.5`}>
            <div className="flex items-center gap-2 mb-1.5">
                <Icon
                    size={15}
                    className={`shrink-0 ${isPlaying ? "wd-bot-disc-spin" : ""}`}
                    style={{ color: colorVar }}
                />
                <span
                    className="text-xs font-medium"
                    style={{ color: colorVar }}
                >
                    {isPlaying ? "Now Playing" : "Paused"}
                </span>
            </div>
            <p className="text-[13px] font-medium wd-text-primary truncate">
                {card.track.title}
            </p>
            <p className="mt-1 text-[11px] wd-text-muted">
                {card.track.duration > 0 && (
                    <span>{formatDuration(card.track.duration)} · </span>
                )}
                <span>{sourceLabel(card.track.source)}</span>
                <span> · Requested by {card.requestedBy}</span>
                {card.listenerCount > 0 && (
                    <span> · {card.listenerCount} listening</span>
                )}
            </p>
        </div>
    );
}
