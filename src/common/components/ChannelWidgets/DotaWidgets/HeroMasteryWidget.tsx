import React, { useEffect, useState } from "react";
import Image from "next/image";
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
    <div className="flex items-center gap-3 py-1.5">
      {hero.heroIcon && (
        <Image
          src={hero.heroIcon}
          alt={hero.heroName}
          width={52}
          height={52}
          className="rounded-lg ring-1 ring-[var(--wd-border-subtle)]"
        />
      )}
      <span className="text-[13px] font-medium wd-text-primary flex-1 truncate">
        {hero.heroName}
      </span>
      <span className="text-[11px] tabular-nums wd-text-muted">{hero.games}g</span>
      <span
        className={`text-[11px] font-bold tabular-nums min-w-[36px] text-right ${
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
    <div className="rounded-xl bg-[var(--wd-surface-panel-2)] p-3">
      <div className="flex items-center gap-2.5 mb-2">
        {rivalry.heroIcon && (
          <img
            src={rivalry.heroIcon}
            alt={rivalry.heroName}
            className="w-10 h-10 rounded-lg ring-1 ring-[var(--wd-border-subtle)]"
          />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted">
          {rivalry.heroName}
        </span>
      </div>
      <div className="space-y-1">
        {rivalry.players.map((p) => (
          <div key={p.dotaAccountId} className="flex justify-between text-[11px]">
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
        <div role="tablist" className="flex gap-0.5 overflow-x-auto no-scrollbar">
          {data.players.map((p, i) => (
            <button
              key={p.dotaAccountId}
              role="tab"
              aria-selected={i === selectedPlayer}
              onClick={() => setSelectedPlayer(i)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
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
          <div className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted mb-1.5">
            Top Heroes
          </div>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-0 pb-1 border-b border-[var(--wd-border-subtle)]">
            <span className="text-[10px] font-medium wd-text-muted uppercase tracking-wide" style={{ marginLeft: 64 }}>Hero</span>
            <span className="flex-1" />
            <span className="text-[10px] font-medium wd-text-muted uppercase tracking-wide">Games</span>
            <span className="text-[10px] font-medium wd-text-muted uppercase tracking-wide min-w-[36px] text-right">WR</span>
          </div>
          <div className="divide-y divide-[var(--wd-border-subtle)]">
            {player.topHeroes.map((hero) => (
              <HeroRow key={hero.heroId} hero={hero} />
            ))}
          </div>
        </div>
      )}

      {/* Rivalries */}
      {data.rivalries.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted mb-2">
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
