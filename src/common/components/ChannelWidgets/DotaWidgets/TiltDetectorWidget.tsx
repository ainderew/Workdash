import React, { useEffect } from "react";
import { Skull, Flame, AlertTriangle } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { PlayerAvatar } from "./PlayerAvatar";
import { ResultPills } from "./ResultPills";
import { pickTiltMessage, interpolate } from "./tiltMessages";
import type { TiltStatus } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

const SEVERITY_CONFIG: Record<
  TiltStatus["severity"],
  {
    icon: typeof AlertTriangle;
    bgClass: string;
    textClass: string;
    iconClass: string;
  }
> = {
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-[var(--wd-surface-panel-2)]",
    textClass: "text-[var(--wd-warning)]",
    iconClass: "",
  },
  danger: {
    icon: Flame,
    bgClass: "bg-[var(--wd-surface-panel-2)]",
    textClass: "text-[var(--wd-danger)]",
    iconClass: "wd-fire-icon",
  },
  critical: {
    icon: Skull,
    bgClass: "bg-[var(--wd-surface-panel-2)]",
    textClass: "text-[var(--wd-danger)]",
    iconClass: "wd-fire-icon",
  },
};

export function TiltDetectorWidget({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_tilt_detector`],
  ) as TiltStatus[] | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_tilt_detector");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.length === 0)
    return <WidgetEmpty message="No tilted players — everyone's vibing" />;

  return (
    <div className="space-y-2.5">
      {data.map((alert) => {
        const config = SEVERITY_CONFIG[alert.severity];
        const Icon = config.icon;
        const messageTemplate = pickTiltMessage(
          alert.severity,
          alert.dotaAccountId,
          alert.lossStreak,
        );
        const message = interpolate(messageTemplate, {
          name: alert.displayName,
          streak: alert.lossStreak,
        });

        return (
          <div
            key={alert.dotaAccountId}
            className={`px-3.5 py-3 rounded-xl ${config.bgClass}`}
          >
            {/* Player + banter message */}
            <div className="flex items-start gap-2.5">
              <PlayerAvatar avatarUrl={alert.avatarUrl} displayName={alert.displayName} size={28} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon
                    size={14}
                    className={`${config.textClass} ${config.iconClass} shrink-0`}
                  />
                  <span className="text-[13px] font-semibold wd-text-primary truncate">
                    {alert.displayName}
                  </span>
                </div>
                <p className="text-[12px] wd-text-secondary leading-relaxed mt-1 font-medium">
                  {message}
                </p>
              </div>
            </div>

            {/* W/L indicator boxes */}
            <div className="mt-2.5 ml-[38px]">
              <ResultPills results={alert.recentResults} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
