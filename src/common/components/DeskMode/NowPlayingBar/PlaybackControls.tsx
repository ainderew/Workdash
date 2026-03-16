import React from "react";
import { SkipBack, Play, Pause, SkipForward } from "lucide-react";

interface PlaybackControlsProps {
  state: "playing" | "paused" | "stopped";
  canControl: boolean;
  hasNextTrack: boolean;
  onTogglePlayback: () => void;
  onSkip: () => void;
}

export function PlaybackControls({
  state,
  canControl,
  hasNextTrack,
  onTogglePlayback,
  onSkip,
}: PlaybackControlsProps) {
  const isPlaying = state === "playing";
  const PlayPauseIcon = isPlaying ? Pause : Play;

  return (
    <div className="flex items-center justify-center gap-3 py-1">
      {/* Previous — always disabled (no play history) */}
      <button
        type="button"
        disabled
        className="p-1 rounded-full opacity-40 cursor-not-allowed"
        title="No previous track"
      >
        <SkipBack size={14} strokeWidth={2.5} />
      </button>

      {/* Play/Pause */}
      <button
        type="button"
        disabled={!canControl}
        onClick={onTogglePlayback}
        className={`p-1.5 rounded-full transition-all active:scale-95 ${
          canControl
            ? `cursor-pointer hover:bg-[var(--wd-surface-elevated)] ${isPlaying ? "wd-playback-pulse" : ""}`
            : "opacity-40 cursor-not-allowed"
        }`}
        title={
          !canControl
            ? "You need Manage Music permission"
            : isPlaying
              ? "Pause"
              : "Resume"
        }
      >
        <PlayPauseIcon size={20} strokeWidth={2.5} />
      </button>

      {/* Next */}
      <button
        type="button"
        disabled={!canControl || !hasNextTrack}
        onClick={onSkip}
        className={`p-1 rounded-full transition-all active:scale-95 ${
          canControl && hasNextTrack
            ? "cursor-pointer hover:bg-[var(--wd-surface-elevated)]"
            : "opacity-40 cursor-not-allowed"
        }`}
        title={
          !canControl
            ? "You need Manage Music permission"
            : !hasNextTrack
              ? "No next track"
              : "Skip"
        }
      >
        <SkipForward size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
