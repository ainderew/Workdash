import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Flame,
  Gamepad2,
  Shield,
  ThumbsDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetShell } from "./WidgetShell";
import { WidgetCard } from "./WidgetCard";
import { RolePerformanceWidget } from "./DotaWidgets/RolePerformanceWidget";
import { TiltDetectorWidget } from "./DotaWidgets/TiltDetectorWidget";
import { PowerSpikesWidget } from "./DotaWidgets/PowerSpikesWidget";
import { WardStatsWidget } from "./DotaWidgets/WardStatsWidget";
import { TrendsDashboardWidget } from "./DotaWidgets/TrendsDashboardWidget";
import { ComfortPickWidget } from "./DotaWidgets/ComfortPickWidget";
import { AvgMatchLengthWidget } from "./DotaWidgets/AvgMatchLengthWidget";
import { DamageCompositionWidget } from "./DotaWidgets/DamageCompositionWidget";
import { TeamLeaderboardWidget } from "./DotaWidgets/TeamLeaderboardWidget";

interface Props {
  roomId: string;
  workspaceId: string;
}

interface WidgetMeta {
  component: React.ComponentType<{ workspaceId: string; channelId: string }>;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  accent: string;
}

const WIDGET_META: Record<string, WidgetMeta> = {
  dota_tilt_detector: {
    component: TiltDetectorWidget,
    label: "Tilt Detector",
    icon: AlertTriangle,
    accent: "var(--wd-danger)",
  },
  dota_comfort_picks: {
    component: ComfortPickWidget,
    label: "Comfort Picks",
    icon: ThumbsDown,
    accent: "var(--wd-warning)",
  },
  dota_role_performance: {
    component: RolePerformanceWidget,
    label: "Role Performance",
    icon: Shield,
    accent: "var(--wd-accent)",
  },
  dota_team_leaderboard: {
    component: TeamLeaderboardWidget,
    label: "Team Leaderboard",
    icon: Trophy,
    accent: "var(--wd-warning)",
  },
  dota_ward_stats: {
    component: WardStatsWidget,
    label: "Ward Stats",
    icon: Eye,
    accent: "var(--wd-info)",
  },
  dota_damage_composition: {
    component: DamageCompositionWidget,
    label: "Damage Split",
    icon: Flame,
    accent: "var(--wd-danger)",
  },
  dota_trends: {
    component: TrendsDashboardWidget,
    label: "Trends",
    icon: TrendingUp,
    accent: "var(--wd-success)",
  },
  dota_power_spikes: {
    component: PowerSpikesWidget,
    label: "Power Spikes",
    icon: Zap,
    accent: "var(--wd-warning)",
  },
  dota_avg_match_length: {
    component: AvgMatchLengthWidget,
    label: "Match Duration",
    icon: Clock,
    accent: "var(--wd-info)",
  },
};

interface CategoryDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  widgetTypes: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "standings",
    label: "Standings",
    icon: Trophy,
    widgetTypes: ["dota_team_leaderboard"],
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: AlertTriangle,
    widgetTypes: ["dota_tilt_detector", "dota_comfort_picks"],
  },
  {
    id: "stats",
    label: "Stats",
    icon: BarChart3,
    widgetTypes: [
      "dota_role_performance",
      "dota_ward_stats",
      "dota_damage_composition",
    ],
  },
  {
    id: "trends",
    label: "Trends",
    icon: TrendingUp,
    widgetTypes: ["dota_power_spikes", "dota_trends", "dota_avg_match_length"],
  },
];

export function ChannelWidgetPanel({ roomId, workspaceId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const configs = useWidgetStore((s) => s.configsByChannel[roomId]);
  const fetchWidgetConfigs = useWidgetStore((s) => s.fetchWidgetConfigs);

  useEffect(() => {
    void fetchWidgetConfigs(workspaceId, roomId);
  }, [workspaceId, roomId, fetchWidgetConfigs]);

  const enabledTypes = useMemo(
    () =>
      new Set(
        (configs ?? [])
          .filter((w) => w.isEnabled)
          .map((w) => w.widgetType),
      ),
    [configs],
  );

  const availableCategories = useMemo(
    () =>
      CATEGORIES.filter((cat) =>
        cat.widgetTypes.some((wt) => enabledTypes.has(wt)),
      ),
    [enabledTypes],
  );

  useEffect(() => {
    if (
      availableCategories.length > 0 &&
      !availableCategories.some((c) => c.id === activeCategory)
    ) {
      setActiveCategory(availableCategories[0]!.id);
    }
  }, [availableCategories, activeCategory]);

  if (enabledTypes.size === 0) return null;

  const currentCategory = availableCategories.find(
    (c) => c.id === activeCategory,
  );
  const currentWidgets = currentCategory
    ? currentCategory.widgetTypes.filter((wt) => enabledTypes.has(wt))
    : [];

  return (
    <div className="border-b border-[rgb(var(--wd-border-subtle-rgb)/0.3)]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-4 py-2.5 transition-colors hover:bg-[rgb(var(--wd-surface-elevated-rgb)/0.3)]"
      >
        <Gamepad2 size={14} className="wd-text-muted" />
        <span className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted">
          Dota 2
        </span>
        <span className="ml-auto text-[10px] wd-text-muted opacity-60">
          {enabledTypes.size}
        </span>
        <div className="wd-text-muted">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>

      {!collapsed && (
        <div>
          {availableCategories.length > 1 && (
            <div className="flex gap-0.5 px-3 pb-2.5 overflow-x-auto no-scrollbar">
              {availableCategories.map((cat) => {
                const isActive = cat.id === activeCategory;
                const CatIcon = cat.icon;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? "wd-bg-accent-soft text-[var(--wd-accent)]"
                        : "wd-text-muted hover:wd-text-primary hover:bg-[rgb(var(--wd-surface-elevated-rgb)/0.4)]"
                    }`}
                  >
                    <CatIcon size={12} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="overflow-y-auto no-scrollbar"
            style={{ maxHeight: 480 }}
          >
            <div className="flex flex-col gap-3 px-3 pb-3">
              {currentWidgets.map((widgetType, index) => {
                const meta = WIDGET_META[widgetType];
                if (!meta) return null;

                const Component = meta.component;

                return (
                  <WidgetCard
                    key={widgetType}
                    title={meta.label}
                    icon={meta.icon}
                    accentColor={meta.accent}
                    index={index}
                  >
                    <WidgetShell>
                      <Component
                        workspaceId={workspaceId}
                        channelId={roomId}
                      />
                    </WidgetShell>
                  </WidgetCard>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
