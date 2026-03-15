import React from "react";
import { ListMusic } from "lucide-react";
import type { BotCardQueueList } from "@/communication/chatV2/_types";
import { formatDuration } from "@/common/utils/formatDuration";

interface QueueListCardProps {
    card: BotCardQueueList;
}

const MAX_DISPLAY = 10;

export function QueueListCard({ card }: QueueListCardProps) {
    const stateIcon = card.currentTrack?.state === "paused" ? "\u23F8" : "\u25B6";
    const visibleTracks = card.tracks.slice(0, MAX_DISPLAY);
    const remaining = card.tracks.length - MAX_DISPLAY;

    return (
        <div className="wd-bot-card wd-bot-card--info rounded-lg px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-2">
                <ListMusic size={15} className="shrink-0 text-[var(--wd-info)]" />
                <span className="text-xs font-medium text-[var(--wd-info)]">
                    Queue
                </span>
                {card.tracks.length > 0 && (
                    <span className="text-[10px] wd-text-muted">
                        · {card.tracks.length} track{card.tracks.length !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {card.currentTrack && (
                <>
                    <div className="flex items-center gap-2 rounded-sm bg-[var(--wd-bot-bg-hover)] px-2 py-1.5 mb-1.5">
                        <span className="text-[11px]">{stateIcon}</span>
                        <p className="text-[11px] font-medium wd-text-primary truncate flex-1">
                            {card.currentTrack.title}
                        </p>
                    </div>
                    {card.tracks.length > 0 && (
                        <div className="border-t border-[var(--wd-border-subtle)] my-1" />
                    )}
                </>
            )}

            {visibleTracks.length > 0 ? (
                <ol className="flex flex-col gap-0.5">
                    {visibleTracks.map((track, i) => (
                        <li
                            key={`${track.title}-${i}`}
                            className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-1 px-1"
                        >
                            <span className="text-[10px] wd-text-muted text-right tabular-nums">
                                {i + 1}.
                            </span>
                            <div className="min-w-0">
                                <span className="text-[11px] wd-text-secondary truncate block">
                                    {track.title}
                                </span>
                                <span className="text-[10px] wd-text-muted">
                                    by {track.requestedBy}
                                </span>
                            </div>
                            {track.duration > 0 && (
                                <span className="text-[10px] wd-text-muted tabular-nums">
                                    {formatDuration(track.duration)}
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            ) : (
                !card.currentTrack && (
                    <p className="text-[11px] wd-text-muted">Queue is empty.</p>
                )
            )}

            {remaining > 0 && (
                <p className="mt-1 text-[10px] wd-text-muted">
                    ...and {remaining} more track{remaining !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}
