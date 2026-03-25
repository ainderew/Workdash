import React, { useEffect, useState } from "react";
import type { PZDeathEvent } from "@/common/store/pzStore";
import { formatRelativeTime } from "@/common/utils/relativeTime";
import { Skull, Swords } from "lucide-react";

interface PZDeathLogProps {
  deaths: PZDeathEvent[];
}

function PZDeathLog({ deaths }: PZDeathLogProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (deaths.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-3">
        <span className="text-xs opacity-25">🛡️</span>
        <p className="text-[10px] wd-text-muted">
          No deaths yet — everyone&apos;s alive... for now
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-52 space-y-1 overflow-y-auto no-scrollbar">
      {deaths.map((death, index) => {
        const isPvp = death.isPvp;
        const borderColor = isPvp
          ? "border-l-[var(--wd-warning)]"
          : "border-l-[var(--wd-danger)]";

        return (
          <div
            key={death.id}
            className={`flex items-start gap-2 rounded-md border-l-2 ${borderColor} bg-[var(--wd-surface-base)] px-2.5 py-1.5 ring-1 ring-[var(--wd-border-subtle)] animate-[wd-pz-death-flash_600ms_ease,wd-slideDown_200ms_ease] [animation-delay:var(--delay)]`}
            style={{ '--delay': index === 0 ? '0ms' : `${index * 40}ms` } as React.CSSProperties}
          >
            {/* Icon */}
            <div className="mt-px shrink-0">
              {isPvp ? (
                <Swords
                  size={11}
                  strokeWidth={2.5}
                  className="text-[var(--wd-warning)]"
                />
              ) : (
                <Skull
                  size={11}
                  strokeWidth={2.5}
                  className="text-[var(--wd-danger)]"
                />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-snug wd-text-primary">
                <span className="font-semibold">
                  {death.workdashUser?.displayName ?? death.username}
                </span>{" "}
                <span className="wd-text-secondary">{death.action}</span>
              </p>
              <span className="mt-0.5 block text-[9px] wd-text-muted tabular-nums">
                {formatRelativeTime(death.timestamp)}
              </span>
            </div>

            {/* PVP badge */}
            {isPvp && (
              <span className="mt-px shrink-0 rounded-sm bg-[rgb(var(--wd-warning-rgb)/0.12)] px-1 py-px text-[8px] font-bold uppercase tracking-wider text-[var(--wd-warning)]">
                PVP
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PZDeathLog;
