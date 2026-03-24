import React from "react";
import {
  Shield,
  AlertTriangle,
  Zap,
  Eye,
  TrendingUp,
  ThumbsDown,
  Clock,
  Flame,
} from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { ChannelWidgetConfig } from "./_types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Shield,
  AlertTriangle,
  Zap,
  Eye,
  TrendingUp,
  ThumbsDown,
  Clock,
  Flame,
};

const WIDGET_ICON: Record<string, string> = {
  dota_role_performance: "Shield",
  dota_tilt_detector: "AlertTriangle",
  dota_power_spikes: "Zap",
  dota_ward_stats: "Eye",
  dota_trends: "TrendingUp",
  dota_comfort_picks: "ThumbsDown",
  dota_avg_match_length: "Clock",
  dota_damage_composition: "Flame",
};

const WIDGET_LABEL: Record<string, string> = {
  dota_role_performance: "Roles",
  dota_tilt_detector: "Tilt",
  dota_power_spikes: "Spikes",
  dota_ward_stats: "Wards",
  dota_trends: "Trends",
  dota_comfort_picks: "Comfort",
  dota_avg_match_length: "Duration",
  dota_damage_composition: "Damage",
};

interface Props {
  widgets: ChannelWidgetConfig[];
  activeTab: string;
  channelId: string;
}

export function WidgetTabBar({ widgets, activeTab, channelId }: Props) {
  const setActiveWidgetTab = useWidgetStore((s) => s.setActiveWidgetTab);

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {widgets.map((w) => {
        const iconName = WIDGET_ICON[w.widgetType] ?? "Shield";
        const Icon = ICON_MAP[iconName];
        const label = WIDGET_LABEL[w.widgetType] ?? w.widgetType;
        const isActive = activeTab === w.widgetType;

        return (
          <button
            key={w.id}
            onClick={() => setActiveWidgetTab(channelId, w.widgetType)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isActive
                ? "wd-bg-accent-soft text-[var(--wd-accent)]"
                : "wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
            }`}
          >
            {Icon && <Icon size={12} />}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
