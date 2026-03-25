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
    <div className="space-y-3">
      {playersWithHeroes.map((player) => (
        <div key={player.dotaAccountId}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <PlayerAvatar avatarUrl={player.avatarUrl} displayName={player.displayName} size={16} />
            <span className="text-[10px] font-semibold wd-text-muted uppercase tracking-wide">
              {player.displayName}
            </span>
          </div>
          <div className="space-y-1.5">
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
                  className="px-2.5 py-2 rounded-lg border border-[var(--wd-warning)]/20 bg-[var(--wd-warning)]/5"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {hero.heroIcon ? (
                      <Image
                        src={hero.heroIcon}
                        alt={hero.heroName}
                        width={20}
                        height={20}
                        className="rounded shrink-0"
                      />
                    ) : (
                      <Skull
                        size={10}
                        className="text-[var(--wd-warning)] shrink-0"
                      />
                    )}
                    <span className="text-xs font-semibold wd-text-primary">
                      {hero.heroName}
                    </span>
                    <span className="ml-auto text-[10px] font-bold text-[var(--wd-warning)] tabular-nums">
                      {hero.winRate}%
                    </span>
                    <span className="text-[10px] wd-text-muted tabular-nums">
                      {hero.gamesPlayed}g
                    </span>
                  </div>
                  <p className="text-[10px] wd-text-muted leading-relaxed ml-4">
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
