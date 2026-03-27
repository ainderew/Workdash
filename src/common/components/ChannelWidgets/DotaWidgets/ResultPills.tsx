import React from "react";

interface Props {
  results: ("W" | "L")[];
}

export function ResultPills({ results }: Props) {
  // Data arrives newest-first from backend; reverse so latest is rightmost
  const chronological = [...results].reverse();

  return (
    <div className="flex items-center gap-1">
      {chronological.map((r, i) => {
        const isLatest = i === chronological.length - 1;
        const winStyles = isLatest
          ? "bg-[var(--wd-success)] text-white"
          : "bg-[var(--wd-success-soft)] text-[var(--wd-success)] opacity-60";
        const lossStyles = isLatest
          ? "bg-[var(--wd-danger)] text-white"
          : "bg-[var(--wd-danger-soft)] text-[var(--wd-danger)] opacity-60";

        return (
          <span
            key={i}
            className={`flex items-center justify-center rounded-lg text-[10px] font-bold ${
              isLatest ? "w-7 h-7" : "w-6 h-6"
            } ${r === "W" ? winStyles : lossStyles}`}
          >
            {r}
          </span>
        );
      })}
    </div>
  );
}
