import React, { useEffect, useState } from "react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { HeroMasteryData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

function HeroRow({ hero }: { hero: HeroMasteryData["players"][number]["topHeroes"][number] }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {hero.heroIcon && (
        <img
          src={hero.heroIcon}
          alt={hero.heroName}
          className="w-6 h-6 rounded"
        />
      )}
      <span className="text-[11px] font-medium wd-text-primary flex-1 truncate">
        {hero.heroName}
      </span>
      <span className="text-[10px] tabular-nums wd-text-muted">{hero.games}g</span>
      <span
        className={`text-[10px] font-bold tabular-nums ${
          hero.winRate >= 55
            ? "text-[var(--wd-success)]"
            : hero.winRate <= 45
              ? "text-[var(--wd-danger)]"
              : "wd-text-primary"
        }`}
      >
        {hero.winRate}%
      </span>
    </div>
  );
}

function RivalryCard({ rivalry }: { rivalry: HeroMasteryData["rivalries"][number] }) {
  return (
    <div className="rounded-lg bg-[var(--wd-surface-elevated)]/30 p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        {rivalry.heroIcon && (
          <img
            src={rivalry.heroIcon}
            alt={rivalry.heroName}
            className="w-5 h-5 rounded"
          />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted">
          {rivalry.heroName}
        </span>
      </div>
      <div className="space-y-0.5">
        {rivalry.players.map((p) => (
          <div key={p.dotaAccountId} className="flex justify-between text-[10px]">
            <span className="wd-text-primary">{p.displayName}</span>
            <span className="tabular-nums wd-text-muted">
              {p.games}g · <span className="font-bold">{p.winRate}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroMasteryWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_hero_mastery`],
  ) as HeroMasteryData | undefined;
  const [selectedPlayer, setSelectedPlayer] = useState(0);

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_hero_mastery");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="No hero data available yet" />;

  const player = data.players[selectedPlayer];

  return (
    <div className="space-y-2.5">
      {/* Player tabs */}
      {data.players.length > 1 && (
        <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
          {data.players.map((p, i) => (
            <button
              key={p.dotaAccountId}
              onClick={() => setSelectedPlayer(i)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                i === selectedPlayer
                  ? "wd-bg-accent-soft text-[var(--wd-accent)]"
                  : "wd-text-muted hover:wd-text-primary"
              }`}
            >
              <PlayerAvatar avatarUrl={p.avatarUrl} displayName={p.displayName} size={14} />
              {p.displayName}
            </button>
          ))}
        </div>
      )}

      {/* Top heroes */}
      {player && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1">
            Top Heroes
          </div>
          <div className="divide-y divide-[var(--wd-border-subtle)]/20">
            {player.topHeroes.map((hero) => (
              <HeroRow key={hero.heroId} hero={hero} />
            ))}
          </div>
        </div>
      )}

      {/* Rivalries */}
      {data.rivalries.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1.5">
            Hero Rivalries
          </div>
          <div className="space-y-1.5">
            {data.rivalries.slice(0, 3).map((rivalry) => (
              <RivalryCard key={rivalry.heroId} rivalry={rivalry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
