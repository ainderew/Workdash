import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Crown, Info } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { MatchRecapData, MatchRecapEntry } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";
import { PerformanceEstimateTooltip } from "./PerformanceEstimateTooltip";
import { MedalBreakdownModal } from "./MedalBreakdownModal";

interface Props {
  workspaceId: string;
  channelId: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PlayerRow({ player }: { player: MatchRecapEntry["players"][number] }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-[var(--wd-surface-panel-2)]">
        <PlayerAvatar
          avatarUrl={player.avatarUrl}
          displayName={player.displayName}
          size={24}
        />
        {player.heroIcon && (
          <Image
            src={player.heroIcon}
            alt={player.heroName}
            width={52}
            height={52}
            className="rounded-lg ring-1 ring-[var(--wd-border-subtle)]"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold wd-text-primary truncate">
              {player.displayName}
            </span>
            {player.isMvp && (
              <Crown
                size={12}
                className="text-[var(--wd-accent)] shrink-0"
              />
            )}
          </div>
          <div className="text-[10px] wd-text-muted truncate">
            {player.heroName}
          </div>
          {player.performanceEstimate && (
            <button
              type="button"
              aria-label={`View performance breakdown for ${player.displayName}`}
              onClick={() => setShowBreakdown(true)}
              className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[var(--wd-accent)]/10 ring-1 ring-[var(--wd-accent)]/20 cursor-pointer hover:bg-[var(--wd-accent)]/20 transition-colors"
            >
              <Image
                src={player.performanceEstimate.imagePath}
                alt={player.performanceEstimate.label}
                width={14}
                height={14}
                className="shrink-0"
              />
              <span className="text-[9px] font-semibold text-[var(--wd-accent)] truncate leading-none">
                Played like {player.performanceEstimate.label}
              </span>
              <Info size={10} className="shrink-0 text-[var(--wd-accent)]/60" />
            </button>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[13px] font-bold tabular-nums wd-text-primary">
            {player.kills}/{player.deaths}/{player.assists}
          </div>
          {player.highlights.length > 0 && (
            <div className="text-[11px] font-medium text-[var(--wd-accent)] truncate max-w-[90px]">
              {player.highlights[0]}
            </div>
          )}
        </div>
      </div>
      {showBreakdown && player.performanceEstimate && (
        <MedalBreakdownModal
          open={showBreakdown}
          onClose={() => setShowBreakdown(false)}
          player={player}
        />
      )}
    </>
  );
}

function MatchCard({ match }: { match: MatchRecapEntry }) {
  const winners = match.players.filter((p) => p.won);
  const losers = match.players.filter((p) => !p.won);
  const hasEstimates = match.players.some((p) => p.performanceEstimate);

  const allWon = match.players.every((p) => p.won);
  const allLost = match.players.every((p) => !p.won);
  const outcomeLabel = allWon ? "Victory" : allLost ? "Defeat" : "Mixed";
  const outcomeColor = allWon
    ? "text-[var(--wd-success)]"
    : allLost
      ? "text-[var(--wd-danger)]"
      : "wd-text-muted";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${outcomeColor}`}
        >
          {outcomeLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] wd-text-muted tabular-nums font-medium">
            {formatDuration(match.durationSec)}
          </span>
          <span className="text-[10px] wd-text-muted">
            {formatTimeAgo(match.startTime)}
          </span>
          {hasEstimates && <PerformanceEstimateTooltip />}
        </div>
      </div>

      <div className="space-y-1.5">
        {winners.map((p) => (
          <PlayerRow key={p.dotaAccountId} player={p} />
        ))}
        {losers.length > 0 && winners.length > 0 && (
          <div className="border-t border-[var(--wd-border-subtle)] my-1.5" />
        )}
        {losers.map((p) => (
          <PlayerRow key={p.dotaAccountId} player={p} />
        ))}
      </div>
    </div>
  );
}

export function MatchRecapWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_match_recap`],
  ) as MatchRecapData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_match_recap");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (!Array.isArray(data) || data.length === 0)
    return <WidgetEmpty message="No recent match to recap" />;

  return (
    <div className="space-y-4">
      {data.map((match) => (
        <MatchCard key={match.matchId} match={match} />
      ))}
    </div>
  );
}
