import React, { useEffect } from "react";
import { Flame, Gamepad2, Zap } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { PlayerAvatar } from "./PlayerAvatar";
import type { MilestoneData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  gamepad: Gamepad2,
  zap: Zap,
  flame: Flame,
};

function MilestoneCard({ milestone }: { milestone: MilestoneData["milestones"][number] }) {
  const Icon = ICON_MAP[milestone.icon] ?? Zap;

  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg bg-[var(--wd-surface-elevated)]/30">
      <PlayerAvatar avatarUrl={milestone.avatarUrl} displayName={milestone.displayName} size={18} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="shrink-0 text-[var(--wd-accent)]" />
          <span className="text-[11px] font-medium wd-text-primary leading-snug">
            {milestone.message}
          </span>
        </div>
        <div className="text-[9px] wd-text-muted mt-0.5">{milestone.date}</div>
      </div>
    </div>
  );
}

export function AchievementFeedWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_milestones`],
  ) as MilestoneData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_milestones");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.milestones.length === 0)
    return <WidgetEmpty message="No milestones unlocked yet — keep playing!" />;

  return (
    <div className="space-y-1.5">
      {data.milestones.slice(0, 8).map((milestone, i) => (
        <MilestoneCard
          key={`${milestone.dotaAccountId}-${milestone.type}-${i}`}
          milestone={milestone}
        />
      ))}
    </div>
  );
}
