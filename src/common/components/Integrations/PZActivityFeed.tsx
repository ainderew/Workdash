import React, { useEffect, useState } from "react";
import type { PZActivityEvent } from "@/common/store/pzStore";
import { formatRelativeTime } from "@/common/utils/relativeTime";
import {
  LogIn,
  LogOut,
  Hammer,
  Building2,
  Home,
  Skull,
  Swords,
} from "lucide-react";

interface PZActivityFeedProps {
  events: PZActivityEvent[];
}

const EVENT_META: Record<
  string,
  { Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; colorClass: string; dotClass: string }
> = {
  player_connect: {
    Icon: LogIn,
    colorClass: "text-[var(--wd-success)]",
    dotClass: "bg-[var(--wd-success)]",
  },
  player_disconnect: {
    Icon: LogOut,
    colorClass: "text-[var(--wd-danger)]",
    dotClass: "bg-[var(--wd-danger)]",
  },
  player_craft: {
    Icon: Hammer,
    colorClass: "text-[var(--wd-warning)]",
    dotClass: "bg-[var(--wd-warning)]",
  },
  base_build: {
    Icon: Building2,
    colorClass: "text-[var(--wd-info)]",
    dotClass: "bg-[var(--wd-info)]",
  },
  safehouse_event: {
    Icon: Home,
    colorClass: "text-[var(--wd-accent)]",
    dotClass: "bg-[var(--wd-accent)]",
  },
  player_death: {
    Icon: Skull,
    colorClass: "text-[var(--wd-danger)]",
    dotClass: "bg-[var(--wd-danger)]",
  },
  pvp_kill: {
    Icon: Swords,
    colorClass: "text-[var(--wd-danger)]",
    dotClass: "bg-[var(--wd-danger)]",
  },
};

const DEFAULT_META = {
  Icon: ({ size, className }: { size?: number; className?: string }) => (
    <span className={`inline-block ${className ?? ""}`} style={{ fontSize: size }}>
      &bull;
    </span>
  ),
  colorClass: "wd-text-muted",
  dotClass: "bg-[var(--wd-text-muted)]",
};

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
      <div className="flex items-center justify-center gap-2 py-3">
        <span className="text-xs opacity-25">📡</span>
        <p className="text-[10px] wd-text-muted">
          Waiting for transmissions...
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto no-scrollbar">
      {/* Timeline spine */}
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--wd-border-subtle)]" />

        <div className="space-y-px">
          {events.map((event, index) => {
            const meta = EVENT_META[event.type] ?? DEFAULT_META;
            const { Icon } = meta;

            return (
              <div
                key={event.id}
                className="group/event relative flex items-start gap-2.5 rounded-md py-1.5 pr-1 pl-0 transition-colors hover:bg-[var(--wd-surface-elevated)] animate-[wd-slideDown_200ms_ease_both] [animation-delay:var(--delay)]"
                style={{ '--delay': `${index * 30}ms` } as React.CSSProperties}
              >
                {/* Timeline dot */}
                <div className="relative z-[1] mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] leading-snug wd-text-primary">
                    <span className="font-semibold">
                      {event.workdashUser?.displayName ?? event.username}
                    </span>{" "}
                    <span className="wd-text-secondary">{event.action}</span>
                  </p>
                  <span className="mt-0.5 block text-[9px] wd-text-muted tabular-nums opacity-0 transition-opacity group-hover/event:opacity-100">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>

                {/* Event icon — lucide instead of emoji */}
                <div className={`mt-0.5 shrink-0 ${meta.colorClass} opacity-50`}>
                  <Icon size={10} strokeWidth={2.5} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PZActivityFeed;
