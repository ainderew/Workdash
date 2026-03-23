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
    <div className="space-y-2">
      <div className="flex gap-1 border-b border-[var(--wd-border-subtle)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-2 pb-1.5 text-[0.7rem] font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[var(--wd-accent)] wd-text-primary"
                : "wd-text-muted hover:wd-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {displayed.length > 0 ? (
        <div className="space-y-1.5">
          {displayed.map((player, index) => {
            const value = getStatValue(player, activeTab);
            const barWidth =
              topValue > 0 ? Math.max((value / topValue) * 100, 4) : 0;
            const name =
              player.workdashUser?.displayName ?? player.pzUsername;

            return (
              <div key={player.steamId} className="flex items-center gap-2">
                <span className="w-4 text-right text-[0.65rem] font-bold wd-text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs wd-text-primary">
                      {name}
                    </span>
                    <span className="shrink-0 text-[0.65rem] font-mono wd-text-muted">
                      {activeTab === "survived"
                        ? formatSurvivalTime(value)
                        : value}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 w-full rounded-full bg-[var(--wd-surface-elevated)]">
                    <div
                      className="h-full rounded-full bg-[var(--wd-accent-soft)] transition-[width] duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-2 text-center text-xs wd-text-muted">
          No stats yet — waiting for events...
        </p>
      )}
    </div>
  );
}

export default PZLeaderboard;
