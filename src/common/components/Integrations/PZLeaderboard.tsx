import React from "react";
import type { PZPlayer } from "@/common/store/pzStore";

type LeaderboardTab = "kills" | "deaths" | "survived";

interface PZLeaderboardProps {
  players: PZPlayer[];
  activeTab: LeaderboardTab;
  onTabChange: (tab: LeaderboardTab) => void;
}

const TABS: { key: LeaderboardTab; label: string }[] = [
  { key: "kills", label: "Kills" },
  { key: "deaths", label: "Deaths" },
  { key: "survived", label: "Survived" },
];

const RANK_MEDALS: Record<number, { label: string; color: string }> = {
  0: { label: "1st", color: "text-[var(--wd-warning)] font-bold" },
  1: { label: "2nd", color: "wd-text-muted font-bold" },
  2: { label: "3rd", color: "text-[rgb(205_127_50)] font-bold" },
};

function getSortedPlayers(
  players: PZPlayer[],
  tab: LeaderboardTab,
): PZPlayer[] {
  const sorted = [...players];
  switch (tab) {
    case "kills":
      return sorted.sort((a, b) => b.kills - a.kills);
    case "deaths":
      return sorted.sort((a, b) => b.deaths - a.deaths);
    case "survived":
      return sorted.sort((a, b) => b.survivalTime - a.survivalTime);
  }
}

function getStatValue(player: PZPlayer, tab: LeaderboardTab): number {
  switch (tab) {
    case "kills":
      return player.kills;
    case "deaths":
      return player.deaths;
    case "survived":
      return player.survivalTime;
  }
}

function formatSurvivalTime(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function PZLeaderboard({
  players,
  activeTab,
  onTabChange,
}: PZLeaderboardProps) {
  const sorted = getSortedPlayers(players, activeTab);
  const topValue = sorted[0] ? getStatValue(sorted[0], activeTab) : 0;
  const displayed = sorted.slice(0, 5);

  return (
    <div className="space-y-2.5">
      {/* Pill tabs — compact, matching NowPlayingBar button feel */}
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`rounded-sm px-2.5 py-0.5 text-[10px] font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-[var(--wd-accent)] text-white"
                : "bg-[var(--wd-surface-base)] wd-text-muted ring-1 ring-[var(--wd-border-subtle)] hover:wd-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rankings — gradient bar fills like the NowPlayingBar progress bar */}
      {displayed.length > 0 ? (
        <div className="space-y-1">
          {displayed.map((player, index) => {
            const value = getStatValue(player, activeTab);
            const barWidth =
              topValue > 0 ? Math.max((value / topValue) * 100, 4) : 0;
            const name =
              player.workdashUser?.displayName ?? player.pzUsername;
            const medal = RANK_MEDALS[index];

            return (
              <div
                key={player.steamId}
                className="group/rank rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--wd-surface-elevated)] animate-[wd-slideDown_200ms_ease_both] [animation-delay:var(--delay)]"
                style={{ '--delay': `${index * 60}ms` } as React.CSSProperties}
              >
                <div className="flex items-center gap-2">
                  {/* Rank */}
                  <span
                    className={`w-5 text-center text-[9px] tabular-nums ${
                      medal?.color ?? "wd-text-muted"
                    }`}
                  >
                    {medal?.label ?? `${index + 1}th`}
                  </span>

                  {/* Name */}
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium wd-text-primary">
                    {name}
                  </span>

                  {/* Value — monospace for that tactical feel */}
                  <span className="shrink-0 text-[10px] font-mono font-semibold wd-text-accent tabular-nums">
                    {activeTab === "survived"
                      ? formatSurvivalTime(value)
                      : value}
                  </span>
                </div>

                {/* Gradient progress bar — same style as NowPlayingBar */}
                <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-[var(--wd-surface-base)]">
                  <div
                    className="h-full origin-left rounded-full animate-[wd-pz-bar-fill_500ms_cubic-bezier(0.25,1,0.5,1)_both] transition-[background] duration-200 group-hover/rank:brightness-125 [animation-delay:var(--bar-delay)]"
                    style={{
                      '--bar-delay': `${index * 60 + 100}ms`,
                      transform: `scaleX(${barWidth / 100})`,
                      background:
                        "linear-gradient(to right, var(--wd-accent-soft), var(--wd-accent), var(--wd-accent-hover))",
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-3">
          <span className="text-xs opacity-25">📊</span>
          <p className="text-[10px] wd-text-muted">
            No stats yet — waiting for events...
          </p>
        </div>
      )}
    </div>
  );
}

export default PZLeaderboard;
