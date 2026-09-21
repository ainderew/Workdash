import React from "react";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

export function StatTile({ label, value, hint, accent }: StatTileProps) {
  return (
    <div className="wd-card px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide wd-text-muted">
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums mt-1"
        style={accent ? { color: "var(--wd-accent)" } : undefined}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] wd-text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export function StatTileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}
