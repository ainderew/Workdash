import React, { useEffect, useState } from "react";
import type { PZDeathEvent } from "@/common/store/pzStore";
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
      <div className="flex flex-col items-center gap-1 py-3">
        <span className="text-base opacity-30">🛡️</span>
        <p className="text-[0.65rem] wd-text-muted">
          No deaths yet — everyone&apos;s alive... for now
        </p>
      </div>
    );
  }

  return (
    <div className="relative max-h-52 space-y-0.5 overflow-y-auto no-scrollbar">
      {/* Timeline spine */}
      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-[var(--wd-border-subtle)]" />

      {deaths.map((death, index) => (
        <div
          key={death.id}
          className="relative flex items-start gap-2.5 rounded-md px-2 py-1.5 animate-[wd-pz-death-flash_600ms_ease,wd-slideDown_200ms_ease]"
          style={{ animationDelay: index === 0 ? "0ms" : `${index * 40}ms` }}
        >
          {/* Timeline dot */}
          <div className="relative z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
            <span
              className={`text-[0.7rem] ${
                death.isPvp
                  ? "text-[var(--wd-warning)]"
                  : "text-[var(--wd-danger)]"
              }`}
            >
              {death.isPvp ? "⚔️" : "💀"}
            </span>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-snug wd-text-primary">
              <span className="font-semibold">
                {death.workdashUser?.displayName ?? death.username}
              </span>{" "}
              <span className="wd-text-secondary">{renderBold(death.action)}</span>
            </p>
            <span className="mt-0.5 block text-[0.55rem] wd-text-muted">
              {formatRelativeTime(death.timestamp)}
            </span>
          </div>

          {death.isPvp && (
            <span className="mt-0.5 shrink-0 rounded bg-[rgb(var(--wd-warning-rgb)/0.12)] px-1 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-[var(--wd-warning)]">
              PVP
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default PZDeathLog;
