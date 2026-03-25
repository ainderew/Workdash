import React from "react";
import type { PZPlayer } from "@/common/store/pzStore";

type LeaderboardTab = "kills" | "deaths" | "survived";

interface PZLeaderboardProps {
  players: PZPlayer[];
  activeTab: LeaderboardTab;
  onTabChange: (tab: LeaderboardTab) => void;
}

const TABS: { key: LeaderboardTab; label: string; icon: string }[] = [
  { key: "kills", label: "Kills", icon: "⚔️" },
  { key: "deaths", label: "Deaths", icon: "💀" },
  { key: "survived", label: "Survived", icon: "⏱️" },
];

const RANK_ACCENTS = [
  "text-[var(--wd-warning)] font-bold",
  "wd-text-muted font-bold",
  "text-[rgb(205_127_50)] font-bold",
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
    <div className="space-y-3">
      {/* Segmented control */}
      <div className="flex gap-0.5 rounded-lg bg-[var(--wd-surface-base)] p-0.5 ring-1 ring-[var(--wd-border-subtle)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[0.65rem] font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-[var(--wd-surface-elevated)] wd-text-primary shadow-[0_1px_3px_rgb(0_0_0/0.1)]"
                : "wd-text-muted hover:wd-text-secondary"
            }`}
          >
            <span className="text-[0.6rem]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rankings */}
      {displayed.length > 0 ? (
        <div className="space-y-1">
          {displayed.map((player, index) => {
            const value = getStatValue(player, activeTab);
            const barWidth =
              topValue > 0 ? Math.max((value / topValue) * 100, 4) : 0;
            const name =
              player.workdashUser?.displayName ?? player.pzUsername;
            const rankStyle = RANK_ACCENTS[index] ?? "wd-text-muted";

            return (
              <div
                key={player.steamId}
                className="group/rank flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--wd-surface-elevated)] animate-[wd-slideDown_200ms_ease_both]"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <span
                  className={`w-4 text-center text-[0.65rem] tabular-nums ${rankStyle}`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-medium wd-text-primary">
                      {name}
                    </span>
                    <span className="shrink-0 text-[0.65rem] font-mono font-semibold wd-text-accent tabular-nums">
                      {activeTab === "survived"
                        ? formatSurvivalTime(value)
                        : value}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--wd-surface-base)]">
                    <div
                      className="h-full origin-left rounded-full bg-[var(--wd-accent-soft)] animate-[wd-pz-bar-fill_500ms_cubic-bezier(0.25,1,0.5,1)_both] group-hover/rank:bg-[var(--wd-accent)]"
                      style={{
                        transform: `scaleX(${barWidth / 100})`,
                        animationDelay: `${index * 60 + 100}ms`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-3">
          <span className="text-base opacity-30">📊</span>
          <p className="text-[0.65rem] wd-text-muted">
            No stats yet — waiting for events...
          </p>
        </div>
      )}
    </div>
  );
}

export default PZLeaderboard;
