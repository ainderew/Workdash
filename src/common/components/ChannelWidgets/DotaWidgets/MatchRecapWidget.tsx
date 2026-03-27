import React, { useEffect } from "react";
import Image from "next/image";
import { Crown } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { MatchRecapData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";
import { PerformanceEstimateTooltip } from "./PerformanceEstimateTooltip";

interface Props {
  workspaceId: string;
  channelId: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function PlayerRow({ player }: { player: MatchRecapData["players"][number] }) {
  return (
    <div
      className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-[var(--wd-surface-panel-2)]"
    >
      <PlayerAvatar avatarUrl={player.avatarUrl} displayName={player.displayName} size={24} />
      {player.heroIcon && (
        <Image
          src={player.heroIcon}
          alt={player.heroName}
          width={52}
          height={52}
          className="rounded-lg ring-1 ring-[var(--wd-border-subtle)]"
        />
      )}
      {player.performanceEstimate && (
        <Image
          src={player.performanceEstimate.imagePath}
          alt={player.performanceEstimate.label}
          width={28}
          height={28}
          className="shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold wd-text-primary truncate">
            {player.displayName}
          </span>
          {player.isMvp && (
            <Crown size={12} className="text-[var(--wd-accent)] shrink-0" />
          )}
        </div>
        <div className="text-[10px] wd-text-muted truncate">
          {player.heroName}
        </div>
        {player.performanceEstimate && (
          <div className="text-[9px] font-semibold text-[var(--wd-accent)] truncate mt-0.5">
            Played like {player.performanceEstimate.label}
          </div>
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
  if (data.players.length === 0)
    return <WidgetEmpty message="No recent match to recap" />;

  const winners = data.players.filter((p) => p.won);
  const losers = data.players.filter((p) => !p.won);
  const hasEstimates = data.players.some((p) => p.performanceEstimate);

  return (
    <div className="space-y-2.5">
      {/* Match header */}
      <div className="flex items-center justify-between px-1">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${
            data.radiantWin
              ? "text-[var(--wd-success)]"
              : "text-[var(--wd-danger)]"
          }`}
        >
          {data.radiantWin ? "Radiant" : "Dire"} Victory
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] wd-text-muted tabular-nums font-medium">
            {formatDuration(data.durationSec)}
          </span>
          {hasEstimates && <PerformanceEstimateTooltip />}
        </div>
      </div>

      {/* Player list */}
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
