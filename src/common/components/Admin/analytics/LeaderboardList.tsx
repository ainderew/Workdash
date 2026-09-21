import React from "react";

export interface LeaderboardEntry {
  key: string;
  title: string;
  subtitle?: string;
  value: string;
}

export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm wd-text-muted">Nothing to rank yet.</p>;
  }

  return (
    <ol className="space-y-1.5">
      {entries.map((entry, index) => (
        <li
          key={entry.key}
          className="flex items-center gap-3 text-sm min-w-0 py-1"
        >
          <span className="w-5 text-[11px] wd-text-muted tabular-nums shrink-0">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate wd-text-secondary">
              {entry.title}
            </span>
            {entry.subtitle && (
              <span className="block truncate text-[11px] wd-text-muted">
                {entry.subtitle}
              </span>
            )}
          </span>
          <span className="tabular-nums font-medium whitespace-nowrap shrink-0">
            {entry.value}
          </span>
        </li>
      ))}
    </ol>
  );
}
