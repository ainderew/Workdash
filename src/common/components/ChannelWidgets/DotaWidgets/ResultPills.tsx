import React from "react";

interface Props {
  results: ("W" | "L")[];
}

export function ResultPills({ results }: Props) {
  // Data arrives newest-first from backend; reverse so latest is rightmost
  const chronological = [...results].reverse();

  return (
    <div className="flex items-center gap-0.5">
      {chronological.map((r, i) => {
        const isLatest = i === chronological.length - 1;
        return (
          <span
            key={i}
            className={`flex items-center justify-center rounded-md text-[10px] font-bold ${
              isLatest ? "w-6 h-6" : "w-5 h-5 opacity-70"
            } ${
              r === "W"
                ? "bg-[var(--wd-success)]/25 text-[var(--wd-success)]"
                : "bg-[var(--wd-danger)]/25 text-[var(--wd-danger)]"
            }`}
          >
            {r}
          </span>
        );
      })}
    </div>
  );
}
