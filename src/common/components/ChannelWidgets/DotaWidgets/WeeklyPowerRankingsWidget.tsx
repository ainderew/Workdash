import React, { useEffect } from "react";
import {
  Crown,
  ChevronUp,
  ChevronDown,
  Minus,
  TrendingUp,
} from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { pickRankingMessage } from "./powerRankingMessages";
import { interpolate } from "./tiltMessages";
import type { WeeklyPowerRankingsData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

interface RankingEntryProps {
  ranking: WeeklyPowerRankingsData["rankings"][number];
  isLast: boolean;
  weekSeed: number;
}

function RankDeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[var(--wd-success)]">
        <ChevronUp size={12} />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[var(--wd-danger)]">
        <ChevronDown size={12} />
        {Math.abs(delta)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] wd-text-muted">
      <Minus size={12} />
    </span>
  );
}

function RankingEntry({ ranking, isLast }: Omit<RankingEntryProps, "weekSeed">) {
  const isFirst = ranking.rank === 1;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
        isFirst
          ? "bg-[var(--wd-accent)]/5"
          : isLast
            ? "bg-[var(--wd-danger)]/4"
            : "bg-[var(--wd-surface-elevated)]/30"
      }`}
    >
      {/* Rank */}
      <div className="w-6 shrink-0 text-center">
        {isFirst ? (
          <Crown
            size={14}
            className="wd-leaderboard-medal-1 wd-leaderboard-crown mx-auto"
          />
        ) : (
          <span className="text-[11px] font-bold wd-text-muted">
            {ranking.rank}
          </span>
        )}
      </div>

      {/* Player info */}
      <PlayerAvatar avatarUrl={ranking.avatarUrl} displayName={ranking.displayName} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold wd-text-primary truncate">
            {ranking.displayName}
          </span>
          {ranking.isMvp && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--wd-accent)]">
              MVP
            </span>
          )}
          {ranking.isMostImproved && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--wd-success)]">
              <TrendingUp size={10} />
              Rising
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] wd-text-muted">
          <span>{ranking.gamesPlayed}g</span>
          <span className="wd-text-muted">·</span>
          <span>Impact: {ranking.impactScore}</span>
          {ranking.bestHero.heroName && ranking.bestHero.games > 0 && (
            <>
              <span className="wd-text-muted">·</span>
              <span className="truncate">{ranking.bestHero.heroName}</span>
            </>
          )}
        </div>
      </div>

      {/* Win rate + rank delta */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[11px] font-bold tabular-nums ${
            ranking.winRate >= 55
              ? "text-[var(--wd-success)]"
              : ranking.winRate <= 45
                ? "text-[var(--wd-danger)]"
                : "wd-text-primary"
          }`}
        >
          {ranking.winRate}%
        </span>
        <RankDeltaBadge delta={ranking.rankDelta} />
      </div>
    </div>
  );
}

export function WeeklyPowerRankingsWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_weekly_power_rankings`],
  ) as WeeklyPowerRankingsData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_weekly_power_rankings");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.rankings.length === 0)
    return <WidgetEmpty message="Need more games to crown a champion" />;

  const weekSeed = new Date(data.weekStart).getTime();
  const firstPlace = data.rankings[0]!;
  const lastPlace = data.rankings.length > 1 ? data.rankings[data.rankings.length - 1]! : null;
  const mostImproved = data.rankings.find((r) => r.isMostImproved);

  // Pick banter message for top dramatic event
  let banterMessage = "";
  if (firstPlace) {
    banterMessage = interpolate(
      pickRankingMessage("first", firstPlace.dotaAccountId, weekSeed),
      { name: firstPlace.displayName, score: firstPlace.impactScore },
    );
  }

  return (
    <div>
      {/* Banter callout */}
      {banterMessage && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--wd-accent)]/5">
          <p className="text-[11px] font-medium text-[var(--wd-accent)] leading-relaxed">
            {banterMessage}
          </p>
        </div>
      )}

      {/* Rankings list */}
      <div className="space-y-1.5">
        {data.rankings.map((ranking) => (
          <RankingEntry
            key={ranking.dotaAccountId}
            ranking={ranking}
            isLast={lastPlace?.dotaAccountId === ranking.dotaAccountId}
          />
        ))}
      </div>

      {/* Last place roast */}
      {lastPlace && data.rankings.length > 2 && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--wd-danger)]/5">
          <p className="text-[10px] wd-text-muted leading-relaxed">
            {interpolate(
              pickRankingMessage("last", lastPlace.dotaAccountId, weekSeed),
              { name: lastPlace.displayName },
            )}
          </p>
        </div>
      )}

      {/* Most improved callout */}
      {mostImproved && mostImproved.rankDelta > 0 && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-[var(--wd-success)]/5">
          <p className="text-[10px] text-[var(--wd-success)] leading-relaxed">
            {interpolate(
              pickRankingMessage("improved", mostImproved.dotaAccountId, weekSeed),
              { name: mostImproved.displayName, delta: mostImproved.rankDelta },
            )}
          </p>
        </div>
      )}

      {/* Week range */}
      <div className="mt-2 text-[9px] wd-text-muted text-center">
        {data.weekStart} — {data.weekEnd}
      </div>
    </div>
  );
}
