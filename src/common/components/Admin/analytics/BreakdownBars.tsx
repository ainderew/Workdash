import React from "react";
import { formatCount, formatPercent } from "../format";

export interface BreakdownRow {
  label: string;
  value: number;
  color?: string;
}

/**
 * Horizontal proportion bars. Preferred over a pie for these small categorical
 * splits — labels and exact counts stay readable at any width.
 */
export function BreakdownBars({ rows }: { rows: BreakdownRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (total === 0) {
    return <p className="text-sm wd-text-muted">Nothing recorded yet.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((row, index) => {
        const share = row.value / total;
        const color = row.color ?? `var(--wd-dota-${(index % 6) + 1})`;

        return (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
              <span className="wd-text-secondary truncate">{row.label}</span>
              <span className="wd-text-muted tabular-nums whitespace-nowrap">
                {formatCount(row.value)} · {formatPercent(share)}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--wd-border-subtle)" }}
              role="img"
              aria-label={`${row.label}: ${formatCount(row.value)}, ${formatPercent(share)}`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(share * 100, 1)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
