import React from "react";

interface ProgressBarProps {
  elapsed: number;
  duration: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProgressBar({ elapsed, duration }: ProgressBarProps) {
  const pct = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-[9px] wd-text-muted tabular-nums w-7 text-right shrink-0">
        {formatTime(elapsed)}
      </span>
      <div className="flex-1 h-1 rounded-full bg-[var(--wd-surface-elevated)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(to right, var(--wd-accent-soft), var(--wd-accent), var(--wd-accent-hover))",
          }}
        />
      </div>
      <span className="text-[9px] wd-text-muted tabular-nums w-7 shrink-0">
        {duration > 0 ? formatTime(duration) : "--:--"}
      </span>
    </div>
  );
}
