import React, { useEffect } from "react";
import { Eye, Flame, Gamepad2, Sword, Target, Trophy } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import type { MonthlyAwardsData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  trophy: Trophy,
  sword: Sword,
  target: Target,
  flame: Flame,
  gamepad: Gamepad2,
  eye: Eye,
};

function AwardCard({ award }: { award: MonthlyAwardsData["awards"][number] }) {
  const Icon = ICON_MAP[award.icon] ?? Trophy;

  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[var(--wd-surface-panel-2)]">
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: "color-mix(in srgb, var(--wd-accent) 15%, transparent)" }}
      >
        <Icon size={16} className="text-[var(--wd-accent)]" />
      </div>
      <PlayerAvatar avatarUrl={award.avatarUrl} displayName={award.displayName} size={28} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--wd-accent)]">
          {award.title}
        </div>
        <div className="text-[13px] font-bold wd-text-primary truncate">
          {award.displayName}
        </div>
        <div className="text-[11px] wd-text-muted tabular-nums">{award.stat}</div>
      </div>
    </div>
  );
}

export function MonthlyAwardsWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_monthly_awards`],
  ) as MonthlyAwardsData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_monthly_awards");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.awards.length === 0)
    return <WidgetEmpty message="Not enough data for monthly awards yet" />;

  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted text-center">
        {data.month}
      </div>
      <div className="space-y-2">
        {data.awards.map((award, i) => (
          <AwardCard key={`${award.dotaAccountId}-${award.title}-${i}`} award={award} />
        ))}
      </div>
    </div>
  );
}
