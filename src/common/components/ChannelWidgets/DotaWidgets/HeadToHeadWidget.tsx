import React, { useEffect, useState } from "react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { HeadToHeadData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

type Matchup = HeadToHeadData["matchups"][number];

function RoleComparison({ role }: { role: Matchup["sharedRoles"][number] }) {
  return (
    <div className="rounded-xl bg-[var(--wd-surface-panel-2)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted mb-2.5 text-center">
        {role.role}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div>
          <div className={`text-[13px] font-bold tabular-nums ${role.winner === "A" ? "text-[var(--wd-success)]" : "wd-text-primary"}`}>
            {role.playerAWinRate}%
          </div>
          <div className="text-[10px] wd-text-muted mt-0.5">{role.playerAGames}g · {role.playerAKda} KDA</div>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-[10px] font-bold wd-text-muted">vs</span>
        </div>
        <div>
          <div className={`text-[13px] font-bold tabular-nums ${role.winner === "B" ? "text-[var(--wd-success)]" : "wd-text-primary"}`}>
            {role.playerBWinRate}%
          </div>
          <div className="text-[10px] wd-text-muted mt-0.5">{role.playerBGames}g · {role.playerBKda} KDA</div>
        </div>
      </div>
    </div>
  );
}

function MatchupCard({ matchup }: { matchup: Matchup }) {
  return (
    <div className="space-y-2.5">
      {/* Header with names */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlayerAvatar avatarUrl={matchup.playerA.avatarUrl} displayName={matchup.playerA.displayName} size={28} />
          <span className="text-[13px] font-semibold wd-text-primary">{matchup.playerA.displayName}</span>
        </div>
        <span className="text-[11px] font-bold wd-text-muted">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold wd-text-primary">{matchup.playerB.displayName}</span>
          <PlayerAvatar avatarUrl={matchup.playerB.avatarUrl} displayName={matchup.playerB.displayName} size={28} />
        </div>
      </div>

      {/* Same team stats */}
      {matchup.gamesOnSameTeam > 0 && (
        <div className="flex items-center justify-center gap-2.5 text-[11px] wd-text-muted">
          <span>{matchup.gamesOnSameTeam} games together</span>
          <span className="font-bold tabular-nums text-[var(--wd-accent)]">
            {matchup.winRateTogether}% WR
          </span>
        </div>
      )}

      {/* Role comparisons */}
      {matchup.sharedRoles.length > 0 && (
        <div className="space-y-2">
          {matchup.sharedRoles.map((role) => (
            <RoleComparison key={role.role} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HeadToHeadWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_head_to_head`],
  ) as HeadToHeadData | undefined;
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_head_to_head");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.matchups.length === 0)
    return <WidgetEmpty message="Not enough shared data for head-to-head comparisons" />;

  const currentMatchup = data.matchups[selectedIdx];
  if (!currentMatchup) return <WidgetEmpty message="No matchup selected" />;

  return (
    <div className="space-y-2.5">
      {/* Pair selector */}
      {data.matchups.length > 1 && (
        <div role="tablist" className="flex gap-1 overflow-x-auto no-scrollbar">
          {data.matchups.map((m, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={selectedIdx === i}
              onClick={() => setSelectedIdx(i)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                selectedIdx === i
                  ? "wd-bg-accent-soft text-[var(--wd-accent)]"
                  : "wd-text-muted hover:wd-text-primary"
              }`}
            >
              {m.playerA.displayName} vs {m.playerB.displayName}
            </button>
          ))}
        </div>
      )}

      <MatchupCard matchup={currentMatchup} />
    </div>
  );
}
