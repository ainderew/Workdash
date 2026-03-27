import React, { useEffect } from "react";
import Image from "next/image";
import { Skull } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { pickComfortRoast, interpolate } from "./tiltMessages";
import type { ComfortPickData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

export function ComfortPickWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_comfort_picks`],
  ) as ComfortPickData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_comfort_picks");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;

  const playersWithHeroes = data.players.filter((p) => p.heroes.length > 0);
  if (playersWithHeroes.length === 0) {
    return (
      <WidgetEmpty message="No copium heroes detected — everyone's playing their best" />
    );
  }

  return (
    <div className="space-y-3.5">
      {playersWithHeroes.map((player) => (
        <div key={player.dotaAccountId}>
          <div className="flex items-center gap-2 mb-2">
            <PlayerAvatar avatarUrl={player.avatarUrl} displayName={player.displayName} />
            <span className="text-[11px] font-semibold wd-text-muted uppercase tracking-wide">
              {player.displayName}
            </span>
          </div>
          <div className="space-y-2">
            {player.heroes.map((hero) => {
              const roastTemplate = pickComfortRoast(
                player.dotaAccountId,
                hero.heroId,
              );
              const roast = interpolate(roastTemplate, {
                name: player.displayName,
                hero: hero.heroName,
                wr: hero.winRate,
                games: hero.gamesPlayed,
              });

              return (
                <div
                  key={hero.heroId}
                  className="px-3 py-2.5 rounded-xl bg-[var(--wd-surface-panel-2)]"
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    {hero.heroIcon ? (
                      <Image
                        src={hero.heroIcon}
                        alt={hero.heroName}
                        width={44}
                        height={44}
                        className="rounded-lg ring-1 ring-[var(--wd-border-subtle)] shrink-0"
                      />
                    ) : (
                      <Skull
                        size={12}
                        className="text-[var(--wd-accent)] shrink-0"
                      />
                    )}
                    <span className="text-[13px] font-semibold wd-text-primary">
                      {hero.heroName}
                    </span>
                    <span className="ml-auto text-[11px] font-bold text-[var(--wd-accent)] tabular-nums">
                      {hero.winRate}%
                    </span>
                    <span className="text-[11px] wd-text-muted tabular-nums">
                      {hero.gamesPlayed}g
                    </span>
                  </div>
                  <p className="text-[11px] wd-text-muted leading-relaxed ml-[46px]">
                    {roast}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
