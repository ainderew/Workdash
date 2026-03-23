import React, { useEffect, useState } from "react";
import type { PZActivityEvent } from "@/common/store/pzStore";
import { formatRelativeTime } from "@/common/utils/relativeTime";

interface PZActivityFeedProps {
  events: PZActivityEvent[];
}

const EVENT_ICONS: Record<string, { icon: string; colorClass: string }> = {
  player_connect: { icon: "\uD83D\uDFE2", colorClass: "text-[var(--wd-success)]" },
  player_disconnect: { icon: "\uD83D\uDD34", colorClass: "text-[var(--wd-danger)]" },
  player_craft: { icon: "\uD83D\uDD28", colorClass: "text-[var(--wd-warning)]" },
  base_build: { icon: "\uD83D\uDEE0\uFE0F", colorClass: "text-[var(--wd-info)]" },
  safehouse_event: { icon: "\uD83C\uDFE0", colorClass: "text-[var(--wd-accent)]" },
  player_death: { icon: "\uD83D\uDC80", colorClass: "text-[var(--wd-danger)]" },
  pvp_kill: { icon: "\u2694\uFE0F", colorClass: "text-[var(--wd-danger)]" },
};

const DEFAULT_ICON = { icon: "\u25CF", colorClass: "text-[var(--wd-text-muted)]" };

function PZActivityFeed({ events }: PZActivityFeedProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (events.length === 0) {
    return (
      <p className="py-2 text-center text-xs wd-text-muted">
        Waiting for events...
      </p>
    );
  }

  return (
    <div className="max-h-60 space-y-1 overflow-y-auto">
      {events.map((event) => {
        const { icon, colorClass } =
          EVENT_ICONS[event.type] ?? DEFAULT_ICON;

        return (
          <div
            key={event.id}
            className="flex items-start gap-2 rounded px-1 py-1 animate-[wd-slideDown_200ms_ease]"
          >
            <span className={`shrink-0 text-sm ${colorClass}`}>{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs wd-text-primary leading-tight">
                <span className="font-semibold">
                  {event.workdashUser?.displayName ?? event.username}
                </span>{" "}
                <span className="wd-text-secondary">{event.action}</span>
              </p>
            </div>
            <span className="shrink-0 text-[0.6rem] wd-text-muted">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default PZActivityFeed;
