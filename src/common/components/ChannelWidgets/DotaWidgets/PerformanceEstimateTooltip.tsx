import React from "react";
import { Info, Coins, Sparkles, Crosshair, Wheat, Swords, Heart } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const CORE_FACTORS = [
  { icon: Coins, label: "GPM", weight: "25%" },
  { icon: Sparkles, label: "XPM", weight: "20%" },
  { icon: Wheat, label: "Last Hits/min", weight: "20%" },
  { icon: Swords, label: "Hero Dmg/min", weight: "20%" },
  { icon: Crosshair, label: "Kills/min", weight: "10%" },
  { icon: Heart, label: "Healing/min", weight: "5%" },
];

const SUPPORT_FACTORS = [
  { icon: Crosshair, label: "Kills/min", weight: "25%" },
  { icon: Heart, label: "Healing/min", weight: "25%" },
  { icon: Swords, label: "Hero Dmg/min", weight: "25%" },
  { icon: Coins, label: "GPM", weight: "10%" },
  { icon: Sparkles, label: "XPM", weight: "10%" },
  { icon: Wheat, label: "Last Hits/min", weight: "5%" },
];

export function PerformanceEstimateTooltip() {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="How performance estimate works"
          className="p-0.5 rounded-md wd-text-muted hover:text-[var(--wd-accent)] hover:wd-bg-accent-soft transition-colors"
        >
          <Info size={12} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={8}
        className="max-w-[300px] p-0 bg-[var(--wd-surface-overlay)] border border-[var(--wd-border-subtle)] rounded-xl shadow-lg"
      >
        <div className="px-3.5 pt-3 pb-1.5">
          <p className="text-[12px] font-semibold text-[var(--wd-text-primary)] mb-1">
            Performance Estimate
          </p>
          <p className="text-[11px] text-[var(--wd-text-secondary)] leading-relaxed">
            This medal shows how you performed compared to <span className="font-semibold">every other
            player of that hero</span> across all of Dota, based on OpenDota&apos;s
            historical benchmarks. It&apos;s not your actual rank — think of it as
            &quot;if this game were your rank test, where would you land?&quot;
          </p>
        </div>

        <div className="px-3.5 py-2">
          <p className="text-[11px] font-semibold text-[var(--wd-text-primary)] mb-1.5">
            What goes into it
          </p>
          <p className="text-[10px] text-[var(--wd-text-secondary)] leading-relaxed mb-2">
            Each stat is a percentile (0–100%) showing where you ranked among all players
            on that hero. The stats are then weighted differently depending on your role:
          </p>

          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] font-bold text-[var(--wd-accent)] mb-1">
                Core (Carry / Mid / Offlane)
              </p>
              <div className="space-y-1">
                {CORE_FACTORS.map(({ icon: FactorIcon, label, weight }) => (
                  <div key={label} className="flex items-center gap-2">
                    <FactorIcon size={10} className="shrink-0 text-[var(--wd-accent)]" />
                    <span className="text-[10px] font-medium text-[var(--wd-text-primary)] flex-1">
                      {label}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--wd-accent)] tabular-nums">
                      {weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-[var(--wd-info)] mb-1">
                Support (Pos 4 / Pos 5)
              </p>
              <div className="space-y-1">
                {SUPPORT_FACTORS.map(({ icon: FactorIcon, label, weight }) => (
                  <div key={label} className="flex items-center gap-2">
                    <FactorIcon size={10} className="shrink-0 text-[var(--wd-info)]" />
                    <span className="text-[10px] font-medium text-[var(--wd-text-primary)] flex-1">
                      {label}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--wd-info)] tabular-nums">
                      {weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-3.5 pb-3 pt-1.5 border-t border-[var(--wd-border-subtle)]">
          <p className="text-[10px] text-[var(--wd-text-muted)] leading-relaxed">
            The weighted average maps to a medal tier — for example, landing in the
            top 10% of benchmarks earns a Divine estimate, while top 5% hits Immortal.
            Only shows up on parsed matches where OpenDota has benchmark data.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
