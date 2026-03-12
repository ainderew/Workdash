import React from "react";
import type { QueuedTrack } from "@/common/store/musicStore";

interface QueuePanelProps {
    tracks: QueuedTrack[];
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function QueuePanel({ tracks }: QueuePanelProps) {
    if (tracks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-4">
                <span className="wd-text-muted text-[10px]">
                    No songs in queue
                </span>
            </div>
        );
    }

    return (
        <ol className="flex flex-col w-full">
            {tracks.map((track, index) => (
                <li
                    key={`${track.title}-${index}`}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--wd-surface-base)] rounded-sm transition-colors"
                >
                    <span className="wd-text-muted text-[10px] w-4 shrink-0 text-right tabular-nums">
                        {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="wd-text-primary text-[11px] font-medium truncate leading-tight">
                            {track.title}
                        </p>
                        <p className="wd-text-muted text-[10px] truncate leading-tight">
                            by {track.requestedBy}
                            {track.duration > 0 && (
                                <span className="ml-1 opacity-60">
                                    {formatDuration(track.duration)}
                                </span>
                            )}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
