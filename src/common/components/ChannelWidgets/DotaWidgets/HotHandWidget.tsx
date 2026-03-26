import React, { useEffect } from "react";
import { Flame, Snowflake } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { pickHotHandMessage } from "./hotHandMessages";
import { interpolate } from "./tiltMessages";
import type { HotHandData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";
import { ResultPills } from "./ResultPills";

interface Props {
  workspaceId: string;
  channelId: string;
}

function HotHandCard({ player }: { player: HotHandData["players"][number] }) {
  const isHot = player.label === "ON FIRE";
  const isCold = player.label === "ICE COLD";
  const banterMessage = pickHotHandMessage(player.label, player.dotaAccountId);

  return (
    <div
      className={`px-3 py-2.5 rounded-xl transition-colors ${
        isHot
          ? "bg-[var(--wd-danger)]/10"
          : isCold
            ? "bg-[var(--wd-info)]/10"
            : "bg-[var(--wd-surface-elevated)]"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <PlayerAvatar avatarUrl={player.avatarUrl} displayName={player.displayName} />
        {isHot ? (
          <Flame size={14} className="text-[var(--wd-danger)] wd-fire-icon" />
        ) : isCold ? (
          <Snowflake size={14} className="text-[var(--wd-info)]" />
        ) : null}
        <span className="text-xs font-semibold wd-text-primary">
          {player.displayName}
        </span>
        <span
          className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${
            isHot
              ? "text-[var(--wd-danger)]"
              : isCold
                ? "text-[var(--wd-info)]"
                : "wd-text-muted"
          }`}
        >
          {player.label}
        </span>
      </div>

      <ResultPills results={player.recentResults} />

      {banterMessage && (
        <p className="mt-1.5 text-[11px] wd-text-secondary leading-relaxed">
          {interpolate(banterMessage, { name: player.displayName, score: player.score })}
        </p>
      )}
    </div>
  );
}

export function HotHandWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_hot_hand`],
  ) as HotHandData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_hot_hand");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="Not enough data to read the temperature yet" />;

  return (
    <div className="space-y-1.5">
      {data.players.map((player) => (
        <HotHandCard key={player.dotaAccountId} player={player} />
      ))}
    </div>
  );
}
