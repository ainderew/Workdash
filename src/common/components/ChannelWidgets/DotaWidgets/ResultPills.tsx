import React from "react";

interface Props {
  results: ("W" | "L")[];
}

export function ResultPills({ results }: Props) {
  return (
    <div className="flex gap-0.5">
      {results.map((r, i) => (
        <span
          key={i}
          className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
            r === "W"
              ? "bg-[var(--wd-success)]/25 text-[var(--wd-success)]"
              : "bg-[var(--wd-danger)]/25 text-[var(--wd-danger)]"
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
