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
    <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-[var(--wd-surface-elevated)]/30">
      {/* Avatar */}
      <div className="shrink-0">
        {player.avatarUrl ? (
          <Image
            src={player.avatarUrl}
            alt={`${player.displayName}'s avatar`}
            width={48}
            height={48}
            className="rounded-lg"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[var(--wd-surface-elevated)] flex items-center justify-center text-sm font-bold wd-text-muted">
            {player.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold wd-text-primary truncate">
            {player.displayName}
          </span>
          <a
            href={steamProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="wd-text-muted hover:text-[var(--wd-accent)] transition-colors shrink-0"
            aria-label={`View ${player.displayName}'s Steam profile`}
          >
            <ExternalLink size={11} />
          </a>
        </div>

        {player.personaName && player.personaName !== player.displayName && (
          <p className="text-[10px] wd-text-muted truncate">{player.personaName}</p>
        )}

        {/* Rank + MMR row */}
        <div className="flex items-center gap-2 mt-1.5">
          {medal && (
            <div className="flex items-center gap-1">
              <Image
                src={medal.imagePath}
                alt={medal.label}
                width={18}
                height={18}
              />
              <span className="text-[10px] font-semibold wd-text-primary">
                {medal.label}
              </span>
            </div>
          )}
          {player.mmrEstimate !== null && player.mmrEstimate > 0 && (
            <span className="text-[10px] wd-text-muted tabular-nums">
              ~{player.mmrEstimate} MMR
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-1">
          {player.totalGames > 0 && (
            <>
              <span className="text-[10px] wd-text-muted tabular-nums">
                {player.totalGames}g
              </span>
              <span className="text-[10px] wd-text-muted">·</span>
              <span
                className={`text-[10px] font-semibold tabular-nums ${
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
              <span className="text-[10px] wd-text-muted">·</span>
              <span className="text-[10px] wd-text-muted truncate">
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
