import React, { useEffect } from "react";
import Image from "next/image";
import { Crown } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { MatchRecapData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

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
      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${
        player.won
          ? "bg-[var(--wd-success)]/5"
          : "bg-[var(--wd-danger)]/5"
      }`}
    >
      <PlayerAvatar avatarUrl={player.avatarUrl} displayName={player.displayName} size={20} />
      {player.heroIcon && (
        <Image
          src={player.heroIcon}
          alt={player.heroName}
          width={24}
          height={24}
          className="rounded"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold wd-text-primary truncate">
            {player.displayName}
          </span>
          {player.isMvp && (
            <Crown size={10} className="text-[var(--wd-warning)] shrink-0" />
          )}
        </div>
        <div className="text-[9px] wd-text-muted truncate">
          {player.heroName}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[11px] font-bold tabular-nums wd-text-primary">
          {player.kills}/{player.deaths}/{player.assists}
        </div>
        {player.highlights.length > 0 && (
          <div className="text-[10px] font-medium text-[var(--wd-warning)] truncate max-w-[80px]">
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

  return (
    <div className="space-y-2">
      {/* Match header */}
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            data.radiantWin
              ? "text-[var(--wd-success)]"
              : "text-[var(--wd-danger)]"
          }`}
        >
          {data.radiantWin ? "Radiant" : "Dire"} Victory
        </span>
        <span className="text-[10px] wd-text-muted tabular-nums">
          {formatDuration(data.durationSec)}
        </span>
      </div>

      {/* Player list */}
      <div className="space-y-1">
        {winners.map((p) => (
          <PlayerRow key={p.dotaAccountId} player={p} />
        ))}
        {losers.length > 0 && winners.length > 0 && (
          <div className="border-t border-[var(--wd-border-subtle)]/20 my-1" />
        )}
        {losers.map((p) => (
          <PlayerRow key={p.dotaAccountId} player={p} />
        ))}
      </div>
    </div>
  );
}
