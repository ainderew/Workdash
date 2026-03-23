import React, { useEffect, useState } from "react";
import type { PZDeathEvent } from "@/common/store/pzStore";
import { formatRelativeTime } from "@/common/utils/relativeTime";

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
      <p className="py-2 text-center text-xs wd-text-muted">
        No deaths yet — everyone&apos;s alive... for now
      </p>
    );
  }

  return (
    <div className="max-h-48 space-y-1 overflow-y-auto">
      {deaths.map((death) => (
        <div
          key={death.id}
          className="flex items-start gap-2 rounded px-1 py-1 animate-[wd-slideDown_200ms_ease]"
        >
          <span
            className={`shrink-0 text-sm ${
              death.isPvp
                ? "text-[var(--wd-warning)]"
                : "text-[var(--wd-danger)]"
            }`}
          >
            {death.isPvp ? "\u2694\uFE0F" : "\uD83D\uDC80"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs wd-text-primary leading-tight">
              <span className="font-semibold">
                {death.workdashUser?.displayName ?? death.username}
              </span>{" "}
              <span className="wd-text-secondary">{death.action}</span>
            </p>
          </div>
          <span className="shrink-0 text-[0.6rem] wd-text-muted">
            {formatRelativeTime(death.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default PZDeathLog;
