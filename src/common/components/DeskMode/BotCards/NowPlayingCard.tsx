import React from "react";
import { PlayCircle } from "lucide-react";
import type { BotCardNowPlaying } from "@/communication/chatV2/_types";
import { formatDuration } from "@/common/utils/formatDuration";

interface NowPlayingCardProps {
    card: BotCardNowPlaying;
}

function sourceLabel(source?: string): string {
    if (source === "soundcloud") return "SoundCloud";
    return "YouTube";
}

export function NowPlayingCard({ card }: NowPlayingCardProps) {
    return (
        <div className="wd-bot-card wd-bot-card--success rounded-lg px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
                <PlayCircle size={15} className="shrink-0 text-[var(--wd-success)]" />
                <span className="text-xs font-medium text-[var(--wd-success)]">
                    Now Playing
                </span>
            </div>
            <p className="text-[13px] font-medium wd-text-primary truncate">
                {card.track.title}
            </p>
            <p className="mt-1 text-[11px] wd-text-muted">
                {card.track.duration > 0 && (
                    <span>{formatDuration(card.track.duration)}</span>
                )}
                {card.track.duration > 0 && <span> · </span>}
                <span>{sourceLabel(card.track.source)}</span>
                <span> · Requested by {card.requestedBy}</span>
            </p>
        </div>
    );
}
