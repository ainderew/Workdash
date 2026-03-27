import React from "react";
import { Info, Swords, Crosshair, Coins, Sparkles, Castle, Eye, Trophy } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const FACTORS = [
  { icon: Swords, label: "KDA", weight: "25%", desc: "(kills + assists) / deaths" },
  { icon: Crosshair, label: "Hero Damage", weight: "20%", desc: "damage dealt per minute" },
  { icon: Coins, label: "GPM", weight: "15%", desc: "gold per minute" },
  { icon: Sparkles, label: "XPM", weight: "10%", desc: "XP per minute" },
  { icon: Castle, label: "Tower Damage", weight: "10%", desc: "objective damage per minute" },
  { icon: Eye, label: "Vision", weight: "10%", desc: "wards placed + dewarded" },
  { icon: Trophy, label: "Win Bonus", weight: "10%", desc: "flat bonus for winning" },
];

export function PowerRankingsInfoTooltip() {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="How power rankings work"
          className="p-0.5 rounded-md wd-text-muted hover:text-[var(--wd-accent)] hover:bg-[var(--wd-accent)]/10 transition-colors"
        >
          <Info size={12} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={8}
        className="max-w-[260px] p-0 bg-[var(--wd-surface-overlay)] border border-[var(--wd-border-subtle)] rounded-xl shadow-lg"
      >
        <div className="px-3.5 pt-3 pb-1">
          <p className="text-[11px] font-semibold text-[var(--wd-text-primary)] mb-0.5">
            How Impact Score Works
          </p>
          <p className="text-[10px] text-[var(--wd-text-secondary)] leading-relaxed">
            Each match gets a 0–100 score based on how you performed
            relative to your squad. Your impact score is the average
            across your last 20 games.
          </p>
        </div>

        <div className="px-3.5 py-2 space-y-1.5">
          {FACTORS.map(({ icon: FactorIcon, label, weight, desc }) => (
            <div key={label} className="flex items-center gap-2">
              <FactorIcon size={10} className="shrink-0 text-[var(--wd-accent)]" />
              <span className="text-[10px] font-semibold text-[var(--wd-text-primary)] w-[52px] shrink-0">
                {label}
              </span>
              <span className="text-[9px] font-bold text-[var(--wd-accent)] w-[28px] shrink-0 tabular-nums">
                {weight}
              </span>
              <span className="text-[9px] text-[var(--wd-text-muted)] truncate">
                {desc}
              </span>
            </div>
          ))}
        </div>

        <div className="px-3.5 pb-3 pt-1 border-t border-[var(--wd-border-subtle)]">
          <p className="text-[9px] text-[var(--wd-text-muted)] leading-relaxed">
            Scores are normalized within your group — 100 means you topped
            every stat, not that you&apos;re Topson. Rank delta shows
            movement from last week.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
