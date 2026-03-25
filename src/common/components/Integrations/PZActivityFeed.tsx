import React, { useEffect, useState } from "react";
import type { PZActivityEvent } from "@/common/store/pzStore";
import { formatRelativeTime } from "@/common/utils/relativeTime";

const BOLD_RE = /(\*\*[^*]+\*\*)/;

function renderBold(text: string): React.ReactNode[] {
  return text.split(BOLD_RE).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold wd-text-primary">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

interface PZActivityFeedProps {
  events: PZActivityEvent[];
}

const EVENT_META: Record<
  string,
  { icon: string; color: string; dotClass: string }
> = {
  player_connect: {
    icon: "→",
    color: "text-[var(--wd-success)]",
    dotClass: "bg-[var(--wd-success)]",
  },
  player_disconnect: {
    icon: "←",
    color: "text-[var(--wd-danger)]",
    dotClass: "bg-[var(--wd-danger)]",
  },
  player_craft: {
    icon: "🔨",
    color: "text-[var(--wd-warning)]",
    dotClass: "bg-[var(--wd-warning)]",
  },
  base_build: {
    icon: "🏗️",
    color: "text-[var(--wd-info)]",
    dotClass: "bg-[var(--wd-info)]",
  },
  safehouse_event: {
    icon: "🏠",
    color: "text-[var(--wd-accent)]",
    dotClass: "bg-[var(--wd-accent)]",
  },
  player_death: {
    icon: "💀",
    color: "text-[var(--wd-danger)]",
    dotClass: "bg-[var(--wd-danger)]",
  },
  pvp_kill: {
    icon: "⚔️",
    color: "text-[var(--wd-danger)]",
    dotClass: "bg-[var(--wd-danger)]",
  },
};

const DEFAULT_META = {
  icon: "•",
  color: "wd-text-muted",
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
      <div className="flex flex-col items-center gap-1 py-3">
        <span className="text-base opacity-30">📡</span>
        <p className="text-[0.65rem] wd-text-muted">
          Waiting for transmissions...
        </p>
      </div>
    );
  }

  return (
    <div className="relative max-h-64 overflow-y-auto no-scrollbar">
      {/* Timeline spine */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--wd-border-subtle)]" />

      <div className="space-y-0.5">
        {events.map((event, index) => {
          const meta = EVENT_META[event.type] ?? DEFAULT_META;

          return (
            <div
              key={event.id}
              className="group/event relative flex items-start gap-3 rounded-md py-1.5 pr-1 pl-0 transition-colors hover:bg-[var(--wd-surface-elevated)] animate-[wd-slideDown_200ms_ease_both]"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Timeline dot */}
              <div className="relative z-[1] mt-1.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug wd-text-primary">
                  <span className="font-semibold">
                    {event.workdashUser?.displayName ?? event.username}
                  </span>{" "}
                  <span className="wd-text-secondary">{renderBold(event.action)}</span>
                </p>
                <span className="mt-0.5 block text-[0.55rem] wd-text-muted opacity-0 transition-opacity group-hover/event:opacity-100">
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>

              {/* Event type icon */}
              <span
                className={`mt-0.5 shrink-0 text-[0.6rem] ${meta.color} opacity-60`}
              >
                {meta.icon}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PZActivityFeed;
