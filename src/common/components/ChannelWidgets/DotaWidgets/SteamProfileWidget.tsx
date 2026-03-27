import React, { useEffect } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { SteamProfileData } from "../_types";
import { parseMedal } from "@/common/utils/dotaMedal";

interface Props {
  workspaceId: string;
  channelId: string;
}

function ProfileCard({ player }: { player: SteamProfileData["players"][number] }) {
  const medal = parseMedal(player.rankTier);
  const steamProfileUrl = `https://steamcommunity.com/profiles/${player.steamId64}`;

  return (
    <div className="flex items-start gap-3.5 px-4 py-3.5 rounded-xl bg-[var(--wd-surface-panel-2)]">
      {/* Avatar */}
      <div className="shrink-0">
        {player.avatarUrl ? (
          <Image
            src={player.avatarUrl}
            alt={`${player.displayName}'s avatar`}
            width={56}
            height={56}
            className="rounded-xl ring-2 ring-[var(--wd-border-subtle)]"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-[var(--wd-surface-elevated)] ring-2 ring-[var(--wd-border-subtle)] flex items-center justify-center text-base font-bold wd-text-muted">
            {player.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold wd-text-primary truncate">
            {player.displayName}
          </span>
          <a
            href={steamProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="wd-text-muted hover:text-[var(--wd-accent)] transition-colors shrink-0"
            aria-label={`View ${player.displayName}'s Steam profile`}
          >
            <ExternalLink size={12} />
          </a>
        </div>

        {player.personaName && player.personaName !== player.displayName && (
          <p className="text-[11px] wd-text-muted truncate mt-0.5">{player.personaName}</p>
        )}

        {/* Rank + MMR row */}
        <div className="flex items-center gap-2.5 mt-2">
          {medal && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--wd-surface-elevated)]">
              <Image
                src={medal.imagePath}
                alt={medal.label}
                width={22}
                height={22}
              />
              <span className="text-[11px] font-semibold wd-text-primary">
                {medal.label}
              </span>
            </div>
          )}
          {player.mmrEstimate !== null && player.mmrEstimate > 0 && (
            <span className="text-[11px] wd-text-secondary tabular-nums font-medium">
              ~{player.mmrEstimate} MMR
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-2">
          {player.totalGames > 0 && (
            <>
              <span className="text-[11px] wd-text-secondary tabular-nums">
                {player.totalGames} games
              </span>
              <span className="text-[11px] wd-text-muted">·</span>
              <span
                className={`text-[11px] font-semibold tabular-nums ${
                  player.winRate >= 55
                    ? "text-[var(--wd-success)]"
                    : player.winRate <= 45
                      ? "text-[var(--wd-danger)]"
                      : "wd-text-primary"
                }`}
              >
                {player.winRate}% WR
              </span>
            </>
          )}
          {player.favoriteHero && (
            <>
              <span className="text-[11px] wd-text-muted">·</span>
              <span className="text-[11px] wd-text-secondary truncate">
                {player.favoriteHero.heroName} ({player.favoriteHero.games}g)
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SteamProfileWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_steam_profiles`],
  ) as SteamProfileData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_steam_profiles");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="No tracked players with Steam profiles" />;

  return (
    <div className="space-y-1.5">
      {data.players.map((player) => (
        <ProfileCard key={player.dotaAccountId} player={player} />
      ))}
    </div>
  );
}
