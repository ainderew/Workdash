import React, { useEffect } from "react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { PeerSynergyData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

function SynergyBar({ synergy }: { synergy: number }) {
  // Synergy ranges from ~-0.3 to ~0.3, map to 0-100 bar with center at 50
  const pct = Math.min(100, Math.max(0, 50 + synergy * 150));

  return (
    <div className="h-1.5 rounded-full bg-[var(--wd-border-subtle)]/30 overflow-hidden relative">
      {/* Center marker */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--wd-border-subtle)]" />
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          synergy >= 0
            ? "bg-[var(--wd-success)]"
            : "bg-[var(--wd-danger)]"
        }`}
        style={{
          width: `${synergy >= 0 ? pct - 50 : 50 - pct}%`,
          marginLeft: synergy >= 0 ? "50%" : `${pct}%`,
        }}
      />
    </div>
  );
}

function PairCard({ pair }: { pair: PeerSynergyData["pairs"][number] }) {
  const isPower = pair.label === "Power Duo";
  const isCursed = pair.label === "Cursed Pairing";

  return (
    <div
      className={`px-3 py-2.5 rounded-xl border ${
        isPower
          ? "border-[var(--wd-success)]/30 bg-[var(--wd-success)]/5"
          : isCursed
            ? "border-[var(--wd-danger)]/30 bg-[var(--wd-danger)]/5"
            : "border-[var(--wd-border-subtle)]/30 bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <PlayerAvatar avatarUrl={pair.playerA.avatarUrl} displayName={pair.playerA.displayName} size={16} />
          <span className="text-xs font-semibold wd-text-primary">
            {pair.playerA.displayName}
          </span>
          <span className="wd-text-muted text-[10px]">+</span>
          <PlayerAvatar avatarUrl={pair.playerB.avatarUrl} displayName={pair.playerB.displayName} size={16} />
          <span className="text-xs font-semibold wd-text-primary">
            {pair.playerB.displayName}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            isPower
              ? "text-[var(--wd-success)]"
              : isCursed
                ? "text-[var(--wd-danger)]"
                : "wd-text-muted"
          }`}
        >
          {pair.label}
        </span>
      </div>

      <div className="flex justify-between text-[9px] wd-text-muted mb-0.5">
        <span>Worse</span>
        <span>Better</span>
      </div>
      <SynergyBar synergy={pair.synergy} />

      <div className="flex justify-between mt-1.5 text-[10px] wd-text-muted">
        <span>{pair.games} games together</span>
        <span className="font-bold tabular-nums">{pair.winRate}% WR</span>
        <span className="tabular-nums">
          {pair.synergy >= 0 ? "+" : ""}
          {Math.round(pair.synergy * 100)}% synergy
        </span>
      </div>
    </div>
  );
}

export function PeerSynergyWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_peer_synergy`],
  ) as PeerSynergyData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_peer_synergy");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.pairs.length === 0)
    return <WidgetEmpty message="Not enough shared games to calculate synergy" />;

  return (
    <div className="space-y-1.5">
      {data.pairs.map((pair, i) => (
        <PairCard key={`${pair.playerA.dotaAccountId}-${pair.playerB.dotaAccountId}-${i}`} pair={pair} />
      ))}
    </div>
  );
}
