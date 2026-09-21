import React from "react";

export type RangeDays = 7 | 30 | 90 | 365;

const RANGES: Array<{ days: RangeDays; label: string }> = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
];

interface RangePickerProps {
  days: RangeDays;
  onChange: (days: RangeDays) => void;
}

export function RangePicker({ days, onChange }: RangePickerProps) {
  return (
    <div
      role="group"
      aria-label="Analytics date range"
      className="inline-flex rounded-lg border wd-border-subtle overflow-hidden"
    >
      {RANGES.map((range) => {
        const isActive = range.days === days;
        return (
          <button
            key={range.days}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(range.days)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive ? "wd-text-primary" : "wd-text-muted hover:wd-bg-panel-2"
            }`}
            style={
              isActive
                ? { backgroundColor: "var(--wd-accent-soft)" }
                : undefined
            }
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
