import React, { useEffect } from "react";
import { Skull, Flame, AlertTriangle } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { PlayerAvatar } from "./PlayerAvatar";
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
  }
> = {
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-[var(--wd-warning)]/8",
    textClass: "text-[var(--wd-warning)]",
  },
  danger: {
    icon: Flame,
    bgClass: "bg-[var(--wd-danger)]/10",
    textClass: "text-[var(--wd-danger)]",
  },
  critical: {
    icon: Skull,
    bgClass: "bg-[var(--wd-danger)]/15",
    textClass: "text-[var(--wd-danger)]",
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
            className={`px-3 py-2.5 rounded-xl ${config.bgClass}`}
          >
            {/* Player + banter message */}
            <div className="flex items-start gap-2">
              <PlayerAvatar avatarUrl={alert.avatarUrl} displayName={alert.displayName} size={20} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon
                    size={12}
                    className={`${config.textClass} shrink-0`}
                  />
                  <span className="text-[11px] font-semibold wd-text-primary truncate">
                    {alert.displayName}
                  </span>
                </div>
                <p className="text-[11px] wd-text-secondary leading-relaxed mt-0.5">
                  {message}
                </p>
              </div>
            </div>

            {/* W/L indicator boxes */}
            <div className="flex gap-0.5 mt-2 ml-5">
              {alert.recentResults.map((r, i) => (
                <span
                  key={i}
                  className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                    r === "W"
                      ? "bg-[var(--wd-success)]/25 text-[var(--wd-success)]"
                      : "bg-[var(--wd-danger)]/25 text-[var(--wd-danger)]"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
