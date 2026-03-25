import React, { useEffect } from "react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { pickClutchMessage } from "./hotHandMessages";
import { interpolate } from "./tiltMessages";
import type { ClutchFactorData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

function ClutchCard({ player }: { player: ClutchFactorData["players"][number] }) {
  const isClutch = player.label === "Clutch Gene";
  const isChoke = player.label === "Choke Artist";
  const banterMessage = pickClutchMessage(player.label, player.dotaAccountId);

  return (
    <div
      className={`px-3 py-2.5 rounded-xl border ${
        isClutch
          ? "border-[var(--wd-success)]/30 bg-[var(--wd-success)]/5"
          : isChoke
            ? "border-[var(--wd-danger)]/30 bg-[var(--wd-danger)]/5"
            : "border-[var(--wd-border-subtle)]/30 bg-transparent"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <PlayerAvatar avatarUrl={player.avatarUrl} displayName={player.displayName} />
        <span className="text-xs font-semibold wd-text-primary">
          {player.displayName}
        </span>
        <span
          className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${
            isClutch
              ? "text-[var(--wd-success)]"
              : isChoke
                ? "text-[var(--wd-danger)]"
                : "wd-text-muted"
          }`}
        >
          {player.label}
        </span>
      </div>

      {/* Comparison bars */}
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="wd-text-muted">Close games</span>
            <span className="font-bold tabular-nums wd-text-primary">
              {player.closeGameWinRate}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--wd-border-subtle)]/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--wd-accent)]"
              style={{ width: `${Math.min(player.closeGameWinRate, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="wd-text-muted">All games</span>
            <span className="font-bold tabular-nums wd-text-primary">
              {player.normalWinRate}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--wd-border-subtle)]/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--wd-border-subtle)]"
              style={{ width: `${Math.min(player.normalWinRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-1 text-[10px] wd-text-muted">
        {player.closeGamesPlayed} close games · Factor: {player.clutchFactor}x
      </div>

      {banterMessage && (
        <p className="mt-1.5 text-[10px] wd-text-muted leading-relaxed italic">
          {interpolate(banterMessage, { name: player.displayName })}
        </p>
      )}
    </div>
  );
}

export function ClutchFactorWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_clutch_factor`],
  ) as ClutchFactorData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_clutch_factor");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="Not enough close games to measure clutch factor" />;

  return (
    <div className="space-y-1.5">
      {data.players.map((player) => (
        <ClutchCard key={player.dotaAccountId} player={player} />
      ))}
    </div>
  );
}
