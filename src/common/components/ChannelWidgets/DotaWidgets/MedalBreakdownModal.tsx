import React, { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Coins,
  Sparkles,
  Crosshair,
  Wheat,
  Swords,
  Heart,
  Eye,
} from "lucide-react";
import DeskModalShell from "../../DeskMode/modals/DeskModalShell";
import type { MatchRecapEntry } from "../_types";

type Player = MatchRecapEntry["players"][number];
type PerformanceEstimate = NonNullable<Player["performanceEstimate"]>;
type Benchmarks = PerformanceEstimate["benchmarks"];

interface MedalBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
}

const STAT_CONFIG: {
  key: keyof Benchmarks;
  label: string;
  rawKey: string;
  icon: React.ElementType;
  unit: string;
  perMin: boolean;
}[] = [
  { key: "gpm", label: "Gold/min", rawKey: "gpm", icon: Coins, unit: "GPM", perMin: false },
  {
    key: "xpm",
    label: "XP/min",
    rawKey: "xpm",
    icon: Sparkles,
    unit: "XPM",
    perMin: false,
  },
  {
    key: "kpm",
    label: "Kills/min",
    rawKey: "kills",
    icon: Crosshair,
    unit: "kills",
    perMin: true,
  },
  {
    key: "lhpm",
    label: "Last Hits/min",
    rawKey: "lastHits",
    icon: Wheat,
    unit: "LH",
    perMin: true,
  },
  {
    key: "hdpm",
    label: "Hero Dmg/min",
    rawKey: "heroDamage",
    icon: Swords,
    unit: "dmg",
    perMin: true,
  },
  {
    key: "hhpm",
    label: "Healing/min",
    rawKey: "heroHealing",
    icon: Heart,
    unit: "heal",
    perMin: true,
  },
];

const MEDAL_TIERS = [
  "Herald",
  "Guardian",
  "Crusader",
  "Archon",
  "Legend",
  "Ancient",
  "Divine",
  "Immortal",
] as const;

function getBarColor(percentile: number): string {
  if (percentile >= 0.9) return "var(--wd-success)";
  if (percentile >= 0.7) return "var(--wd-accent)";
  if (percentile >= 0.5) return "var(--wd-info)";
  return "var(--wd-text-muted)";
}

function formatRaw(value: number, unit: string): string {
  if (unit === "dmg" || unit === "heal") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function getPerMinValue(
  estimate: PerformanceEstimate,
  stat: (typeof STAT_CONFIG)[number],
): number {
  const totalValue =
    estimate.rawStats[stat.rawKey as keyof PerformanceEstimate["rawStats"]];
  return stat.perMin
    ? totalValue / Math.max(1, estimate.durationMin)
    : totalValue;
}

function StatRow({
  stat,
  estimate,
  tierAvg,
  tierName,
}: {
  stat: (typeof STAT_CONFIG)[number];
  estimate: PerformanceEstimate;
  tierAvg: number | undefined;
  tierName: string;
}) {
  const bench = estimate.benchmarks[stat.key];
  if (bench === null || bench === undefined) return null;

  if (stat.key === "lhpm" && estimate.isSupport) return null;

  const rawValue = getPerMinValue(estimate, stat);
  const percent = Math.round(bench * 100);
  const weight = estimate.weights[stat.key];
  const StatIcon = stat.icon;
  const accentToken = estimate.isSupport ? "--wd-info" : "--wd-accent";
  const aboveTier = tierAvg !== undefined && rawValue >= tierAvg;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <StatIcon
        size={14}
        className={`shrink-0 text-[var(${accentToken})]`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] font-medium text-[var(--wd-text-secondary)]">
            {stat.label}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold tabular-nums ${
                tierAvg !== undefined
                  ? aboveTier
                    ? "text-[var(--wd-success)]"
                    : "text-[var(--wd-danger)]"
                  : "text-[var(--wd-text-primary)]"
              }`}
            >
              {formatRaw(rawValue, stat.unit)}
            </span>
            {tierAvg !== undefined ? (
              <span className="text-[10px] tabular-nums text-[var(--wd-text-muted)]">
                {tierName}: {formatRaw(tierAvg, stat.unit)}
              </span>
            ) : (
              <span className="text-[11px] font-bold tabular-nums" style={{ color: getBarColor(bench) }}>
                {percent}th
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--wd-surface-panel-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${percent}%`,
                backgroundColor: getBarColor(bench),
              }}
            />
          </div>
          {weight !== undefined && (
            <span
              className={`text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-[var(${accentToken})]/15 text-[var(${accentToken})]`}
            >
              {Math.round(weight * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MedalTabs({
  selected,
  onSelect,
  currentMedal,
}: {
  selected: string;
  onSelect: (tier: string) => void;
  currentMedal: string;
}) {
  return (
    <div className="flex justify-between pb-0.5">
      {MEDAL_TIERS.map((tier) => {
        const isSelected = tier === selected;
        const isCurrent = tier.toLowerCase() === currentMedal.toLowerCase();
        return (
          <button
            key={tier}
            onClick={() => onSelect(tier)}
            title={tier}
            className={`flex-1 flex items-center justify-center py-1 rounded-md transition-colors ${
              isSelected
                ? "bg-[var(--wd-accent)] text-[var(--wd-surface-base)]"
                : isCurrent
                  ? "bg-[var(--wd-accent)]/15 text-[var(--wd-accent)]"
                  : "bg-[var(--wd-surface-panel-2)] text-[var(--wd-text-secondary)] hover:text-[var(--wd-text-primary)]"
            }`}
          >
            <Image
              src={`/assets/dota-medals/${tier.toLowerCase()}.png`}
              alt={tier}
              width={20}
              height={20}
            />
          </button>
        );
      })}
    </div>
  );
}

function VisionSection({ visionStats }: { visionStats: NonNullable<PerformanceEstimate["visionStats"]> }) {
  const visionPercent = Math.round(visionStats.visionScore * 100);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Eye size={14} className="text-[var(--wd-info)]" />
        <span className="text-sm font-semibold text-[var(--wd-text-primary)]">
          Vision Score
        </span>
        <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--wd-info)]/15 text-[var(--wd-info)]">
          30%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--wd-text-secondary)]">Obs placed</span>
          <span className="font-semibold text-[var(--wd-text-primary)] tabular-nums">
            {visionStats.obsPlaced}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--wd-text-secondary)]">Sen placed</span>
          <span className="font-semibold text-[var(--wd-text-primary)] tabular-nums">
            {visionStats.senPlaced}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--wd-text-secondary)]">Obs killed</span>
          <span className="font-semibold text-[var(--wd-text-primary)] tabular-nums">
            {visionStats.obsKills}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--wd-text-secondary)]">Sen killed</span>
          <span className="font-semibold text-[var(--wd-text-primary)] tabular-nums">
            {visionStats.senKills}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--wd-surface-panel-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${visionPercent}%`,
              backgroundColor: getBarColor(visionStats.visionScore),
            }}
          />
        </div>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: getBarColor(visionStats.visionScore) }}>
          {visionPercent}th
        </span>
      </div>
    </div>
  );
}

export function MedalBreakdownModal({
  open,
  onClose,
  player,
}: MedalBreakdownModalProps) {
  const estimate = player.performanceEstimate;
  const [selectedTier, setSelectedTier] = useState(estimate?.medal ?? "Archon");

  if (!estimate) return null;

  const overallPercent = Math.round(estimate.percentile * 100);
  const tierAverages = estimate.allTierAverages?.[selectedTier];

  return createPortal(
    <DeskModalShell
      isOpen={open}
      title="Performance Breakdown"
      onClose={onClose}
    >
      <div className="space-y-4 -mt-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Image
              src={player.heroPortrait}
              alt={player.heroName}
              width={80}
              height={80}
              className="rounded-lg ring-1 ring-[var(--wd-border-subtle)] object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = player.heroIcon;
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-[var(--wd-text-primary)] truncate">
              {player.displayName}
            </div>
            <div className="text-[12px] text-[var(--wd-text-secondary)] truncate">
              {player.heroName}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--wd-accent)]/10 ring-1 ring-[var(--wd-accent)]/20">
                <Image
                  src={estimate.imagePath}
                  alt={estimate.label}
                  width={16}
                  height={16}
                  className="shrink-0"
                />
                <span className="text-[10px] font-semibold text-[var(--wd-accent)] leading-none">
                  {estimate.label}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[var(--wd-text-primary)] tabular-nums">
                {overallPercent}%
              </span>
              {estimate.isSupport !== undefined && (
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                    estimate.isSupport
                      ? "bg-[var(--wd-info)]/15 text-[var(--wd-info)]"
                      : "bg-[var(--wd-accent)]/15 text-[var(--wd-accent)]"
                  }`}
                >
                  {estimate.isSupport ? "Support" : "Core"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat Breakdown with Medal Tabs */}
        {estimate.benchmarks && (
          <div>
            <span className="text-sm font-semibold text-[var(--wd-text-primary)]">
              Stat Breakdown
            </span>
            {estimate.allTierAverages && (
              <div className="mt-2 mb-1">
                <MedalTabs
                  selected={selectedTier}
                  onSelect={setSelectedTier}
                  currentMedal={estimate.medal}
                />
              </div>
            )}
            <div className="mt-1">
              {STAT_CONFIG.map((stat) => (
                <StatRow
                  key={stat.key}
                  stat={stat}
                  estimate={estimate}
                  tierAvg={tierAverages?.[stat.key]}
                  tierName={selectedTier}
                />
              ))}
            </div>
          </div>
        )}

        {/* Vision Section (supports only) */}
        {estimate.visionStats && (
          <VisionSection visionStats={estimate.visionStats} />
        )}

        {/* Footer */}
        <p className="text-[10px] text-[var(--wd-text-muted)] leading-relaxed">
          Based on OpenDota benchmarks for {player.heroName}. Percentiles show
          how you performed relative to all players of this hero.
        </p>
      </div>
    </DeskModalShell>,
    document.body,
  );
}
