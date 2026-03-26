import React, { useEffect } from "react";
import { Activity, Flame, Skull, Zap, Timer } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { SessionPulseData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

function PulseIcon({ statType }: { statType: string }) {
  switch (statType) {
    case "streak":
      return <Flame size={14} />;
    case "loss_streak":
      return <Skull size={14} />;
    case "monster_kda":
      return <Zap size={14} />;
    case "marathon":
      return <Timer size={14} />;
    default:
      return <Activity size={14} />;
  }
}

export function SessionPulseBanner({ workspaceId, channelId }: Props) {
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_session_pulse`],
  ) as SessionPulseData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_session_pulse");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return null;

  return (
    <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-[var(--wd-accent)]/8 flex items-center gap-2">
      <div className="shrink-0 text-[var(--wd-accent)]">
        <PulseIcon statType={data.statType} />
      </div>
      <p className="text-[11px] font-medium wd-text-primary leading-snug">
        {data.message}
      </p>
    </div>
  );
}
