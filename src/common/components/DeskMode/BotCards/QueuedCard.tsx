import React from "react";
import { ListPlus } from "lucide-react";
import type { BotCardQueued } from "@/communication/chatV2/_types";
import { formatDuration } from "@/common/utils/formatDuration";

interface QueuedCardProps {
    card: BotCardQueued;
}

export function QueuedCard({ card }: QueuedCardProps) {
    return (
        <div className="wd-bot-card wd-bot-card--info rounded-lg px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
                <ListPlus size={15} className="shrink-0 text-[var(--wd-info)]" />
                <span className="text-xs font-medium text-[var(--wd-info)]">
                    Added to Queue
                </span>
            </div>
            <p className="text-[13px] font-medium wd-text-primary truncate">
                {card.track.title}
            </p>
            <p className="mt-1 text-[11px] wd-text-muted">
                {card.track.duration > 0 && (
                    <span>{formatDuration(card.track.duration)} · </span>
                )}
                <span>Position #{card.position}</span>
                <span> · Requested by {card.requestedBy}</span>
            </p>
        </div>
    );
}
