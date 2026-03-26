import React, { useEffect, useState } from "react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { pickTimePatternMessage } from "./hotHandMessages";
import { interpolate } from "./tiltMessages";
import { PlayerAvatar } from "./PlayerAvatar";
import type { TimePatternsData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

function HeatCell({ winRate, games }: { winRate: number; games: number }) {
  const bg =
    games < 5
      ? "bg-[var(--wd-border-subtle)]/10"
      : winRate >= 60
        ? "bg-[var(--wd-success)]/40"
        : winRate >= 50
          ? "bg-[var(--wd-success)]/20"
          : winRate >= 40
            ? "bg-[var(--wd-warning)]/20"
            : "bg-[var(--wd-danger)]/30";

  return (
    <div
      className={`rounded px-1.5 py-1 text-center ${bg}`}
      title={`${winRate}% WR (${games} games)`}
    >
      <span className="text-[9px] font-bold tabular-nums wd-text-primary">
        {games >= 5 ? `${winRate}%` : "-"}
      </span>
    </div>
  );
}

export function TimePatternsWidget({ workspaceId, channelId }: Props) {
  const [activePlayer, setActivePlayer] = useState(0);
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_time_patterns`],
  ) as TimePatternsData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_time_patterns");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="Need more games across different times to spot patterns" />;

  const player = data.players[activePlayer];
  if (!player) return <WidgetEmpty message="No data for this player" />;

  const banterTemplate = pickTimePatternMessage(player.dotaAccountId);
  const banterMessage = interpolate(banterTemplate, {
    name: player.displayName,
    slot: player.bestTimeSlot.slot,
    day: player.bestDay.day,
    wr: player.bestTimeSlot.winRate,
    worstSlot: player.worstTimeSlot.slot,
    worstDay: player.worstDay.day,
  });

  return (
    <div>
      {/* Player tabs */}
      {data.players.length > 1 && (
        <div role="tablist" className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
          {data.players.map((p, i) => (
            <button
              key={p.dotaAccountId}
              role="tab"
              aria-selected={activePlayer === i}
              onClick={() => setActivePlayer(i)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${
                activePlayer === i
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

      {/* Time slot grid */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1.5">
          By Time of Day
        </div>
        <div className="grid grid-cols-4 gap-1">
          {player.timeSlots.map((slot) => (
            <div key={slot.slot}>
              <div className="text-[8px] wd-text-muted text-center mb-0.5 truncate">
                {slot.slot}
              </div>
              <HeatCell winRate={slot.winRate} games={slot.games} />
            </div>
          ))}
        </div>
      </div>

      {/* Day of week grid */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1.5">
          By Day of Week
        </div>
        <div className="grid grid-cols-7 gap-1">
          {player.days.map((d) => (
            <div key={d.day}>
              <div className="text-[8px] wd-text-muted text-center mb-0.5">
                {d.day.slice(0, 3)}
              </div>
              <HeatCell winRate={d.winRate} games={d.games} />
            </div>
          ))}
        </div>
      </div>

      {/* Banter callout */}
      {(player.bestTimeSlot.games >= 5 || player.bestDay.games >= 5) && (
        <div className="px-3 py-2 rounded-lg bg-[var(--wd-accent)]/5">
          <p className="text-[10px] text-[var(--wd-accent)] leading-relaxed">
            {banterMessage}
          </p>
        </div>
      )}
    </div>
  );
}
