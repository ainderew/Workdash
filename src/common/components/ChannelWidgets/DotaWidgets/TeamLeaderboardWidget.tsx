import React, { useEffect, useState } from "react";
import { Crown, Medal } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { TeamLeaderboardData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

interface EntryProps {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  winRate: number;
  gamesPlayed: number;
  avgKda: number;
}

function LeaderboardEntry({
  rank,
  displayName,
  avatarUrl,
  winRate,
  gamesPlayed,
  avgKda,
}: EntryProps) {
  const medalClass =
    rank === 1
      ? "wd-leaderboard-medal-1"
      : rank === 2
        ? "wd-leaderboard-medal-2"
        : rank === 3
          ? "wd-leaderboard-medal-3"
          : "";

  const isTopPlayer = rank === 1;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 rounded-xl transition-colors ${
        isTopPlayer
          ? "py-3 bg-[var(--wd-accent)]/12"
          : "py-2 bg-[var(--wd-surface-elevated)]"
      }`}
    >
      {/* Rank indicator */}
      <div className="w-6 shrink-0 text-center">
        {rank <= 3 ? (
          rank === 1 ? (
            <Crown
              size={16}
              className={`${medalClass} wd-leaderboard-crown mx-auto`}
            />
          ) : (
            <Medal size={14} className={`${medalClass} mx-auto`} />
          )
        ) : (
          <span className="text-[11px] font-bold wd-text-muted">{rank}</span>
        )}
      </div>

      {/* Player name */}
      <PlayerAvatar avatarUrl={avatarUrl} displayName={displayName} size={isTopPlayer ? 24 : 18} />
      <div className="flex-1 min-w-0">
        <div className={`font-semibold wd-text-primary truncate ${isTopPlayer ? "text-[13px]" : "text-xs"}`}>
          {displayName}
          {isTopPlayer && (
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--wd-accent)]">
              MVP
            </span>
          )}
        </div>
        <div className="text-[10px] wd-text-muted">
          {gamesPlayed} games · {avgKda} KDA
        </div>
      </div>

      {/* Win rate bar */}
      <div className="w-16 shrink-0">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span
            className={`font-bold tabular-nums ${
              winRate >= 55
                ? "text-[var(--wd-success)]"
                : winRate <= 45
                  ? "text-[var(--wd-danger)]"
                  : "wd-text-primary"
            }`}
          >
            {winRate}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--wd-surface-elevated)] overflow-hidden">
          <div
            className={`h-full rounded-full wd-wr-bar-transition ${
              winRate >= 55
                ? "bg-[var(--wd-success)]"
                : winRate <= 45
                  ? "bg-[var(--wd-danger)]"
                  : "bg-[var(--wd-accent)]"
            }`}
            style={{ width: `${Math.min(winRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function TeamLeaderboardWidget({ workspaceId, channelId }: Props) {
  const [activeRole, setActiveRole] = useState(0);
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_team_leaderboard`],
  ) as TeamLeaderboardData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_team_leaderboard");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.roles.length === 0)
    return <WidgetEmpty message="Not enough data for leaderboard rankings" />;

  const currentRole = data.roles[activeRole];
  if (!currentRole)
    return <WidgetEmpty message="No rankings for this role" />;

  return (
    <div>
      {/* Role tabs */}
      <div role="tablist" className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
        {data.roles.map((role, i) => (
          <button
            key={role.role}
            role="tab"
            aria-selected={activeRole === i}
            onClick={() => setActiveRole(i)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${
              activeRole === i
                ? "wd-bg-accent-soft text-[var(--wd-accent)]"
                : "wd-text-muted hover:wd-text-primary"
            }`}
          >
            {role.role}
          </button>
        ))}
      </div>

      {/* Rankings list */}
      <div className="space-y-1.5">
        {currentRole.rankings.map((player, rank) => (
          <LeaderboardEntry
            key={player.dotaAccountId}
            rank={rank + 1}
            displayName={player.displayName}
            avatarUrl={player.avatarUrl}
            winRate={player.winRate}
            gamesPlayed={player.gamesPlayed}
            avgKda={player.avgKda}
          />
        ))}

        {currentRole.rankings.length === 0 && (
          <div className="text-[10px] wd-text-muted text-center py-3">
            No players with enough games in this role
          </div>
        )}
      </div>
    </div>
  );
}
