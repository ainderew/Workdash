import React from "react";

interface Props {
  results: ("W" | "L")[];
}

export function ResultPills({ results }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {results.map((r, i) => {
        const isLatest = i === results.length - 1;
        return (
          <span
            key={i}
            className={`flex items-center justify-center rounded-md text-[10px] font-bold ${
              isLatest ? "w-6 h-6" : "w-5 h-5"
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
