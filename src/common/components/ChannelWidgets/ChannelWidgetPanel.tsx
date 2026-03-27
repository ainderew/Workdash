import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  Flame,
  Gamepad2,
  GripHorizontal,
  ScrollText,
  Shield,
  Star,
  Swords,
  ThumbsDown,
  TrendingUp,
  Trophy,
  User,
  Users,
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
import { WeeklyPowerRankingsWidget } from "./DotaWidgets/WeeklyPowerRankingsWidget";
import { SessionPulseBanner } from "./DotaWidgets/SessionPulseBanner";
import { HotHandWidget } from "./DotaWidgets/HotHandWidget";
import { ClutchFactorWidget } from "./DotaWidgets/ClutchFactorWidget";
import { TimePatternsWidget } from "./DotaWidgets/TimePatternsWidget";
import { HeadToHeadWidget } from "./DotaWidgets/HeadToHeadWidget";
import { PeerSynergyWidget } from "./DotaWidgets/PeerSynergyWidget";
import { HeroMasteryWidget } from "./DotaWidgets/HeroMasteryWidget";
import { MatchRecapWidget } from "./DotaWidgets/MatchRecapWidget";
import { AchievementFeedWidget } from "./DotaWidgets/AchievementFeedWidget";
import { MonthlyAwardsWidget } from "./DotaWidgets/MonthlyAwardsWidget";
import { SteamProfileWidget } from "./DotaWidgets/SteamProfileWidget";
import { PowerRankingsInfoTooltip } from "./DotaWidgets/PowerRankingsInfoTooltip";

interface Props {
  roomId: string;
  workspaceId: string;
}

interface WidgetMeta {
  component: React.ComponentType<{ workspaceId: string; channelId: string }>;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  accent: string;
  variant?: "default" | "alert" | "ranking" | "chart";
  headerExtra?: React.ReactNode;
}

const WIDGET_META: Record<string, WidgetMeta> = {
  dota_tilt_detector: {
    component: TiltDetectorWidget,
    label: "Tilt Detector",
    icon: AlertTriangle,
    accent: "var(--wd-danger)",
    variant: "alert",
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
  dota_weekly_power_rankings: {
    component: WeeklyPowerRankingsWidget,
    label: "Power Rankings",
    icon: Crown,
    accent: "var(--wd-accent)",
    variant: "ranking",
    headerExtra: <PowerRankingsInfoTooltip />,
  },
  dota_hot_hand: {
    component: HotHandWidget,
    label: "Hot Hand",
    icon: Flame,
    accent: "var(--wd-warning)",
    variant: "alert",
  },
  dota_clutch_factor: {
    component: ClutchFactorWidget,
    label: "Clutch Factor",
    icon: Shield,
    accent: "var(--wd-accent)",
  },
  dota_time_patterns: {
    component: TimePatternsWidget,
    label: "Time Patterns",
    icon: Clock,
    accent: "var(--wd-info)",
  },
  dota_head_to_head: {
    component: HeadToHeadWidget,
    label: "Head to Head",
    icon: Swords,
    accent: "var(--wd-danger)",
  },
  dota_peer_synergy: {
    component: PeerSynergyWidget,
    label: "Peer Synergy",
    icon: Users,
    accent: "var(--wd-success)",
  },
  dota_hero_mastery: {
    component: HeroMasteryWidget,
    label: "Hero Mastery",
    icon: Star,
    accent: "var(--wd-warning)",
  },
  dota_match_recap: {
    component: MatchRecapWidget,
    label: "Match Recap",
    icon: ScrollText,
    accent: "var(--wd-accent)",
  },
  dota_milestones: {
    component: AchievementFeedWidget,
    label: "Achievements",
    icon: Award,
    accent: "var(--wd-warning)",
  },
  dota_monthly_awards: {
    component: MonthlyAwardsWidget,
    label: "Monthly Awards",
    icon: Trophy,
    accent: "var(--wd-accent)",
    variant: "ranking",
  },
  dota_steam_profiles: {
    component: SteamProfileWidget,
    label: "Steam Profiles",
    icon: User,
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
    id: "drama",
    label: "The Drama",
    icon: Crown,
    widgetTypes: [
      "dota_steam_profiles",
      "dota_weekly_power_rankings",
      "dota_match_recap",
      "dota_hot_hand",
      "dota_tilt_detector",
      "dota_monthly_awards",
    ],
  },
  {
    id: "competition",
    label: "Competition",
    icon: Swords,
    widgetTypes: [
      "dota_head_to_head",
      "dota_peer_synergy",
      "dota_hero_mastery",
      "dota_milestones",
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    widgetTypes: [
      "dota_role_performance",
      "dota_team_leaderboard",
      "dota_trends",
      "dota_clutch_factor",
    ],
  },
  {
    id: "deep",
    label: "Deep Cuts",
    icon: TrendingUp,
    widgetTypes: [
      "dota_ward_stats",
      "dota_power_spikes",
      "dota_damage_composition",
      "dota_comfort_picks",
      "dota_avg_match_length",
      "dota_time_patterns",
    ],
  },
];

const MIN_PANEL_HEIGHT = 120;
const DRAG_HANDLE_HEIGHT = 20;

export function ChannelWidgetPanel({ roomId, workspaceId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

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

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current =
        panelHeight ?? containerRef.current?.offsetHeight ?? 400;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = moveEvent.clientY - startYRef.current;
        const newHeight = Math.max(
          MIN_PANEL_HEIGHT,
          startHeightRef.current + delta,
        );
        setPanelHeight(newHeight);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [panelHeight],
  );

  if (enabledTypes.size === 0) return null;

  const currentCategory = availableCategories.find(
    (c) => c.id === activeCategory,
  );
  const currentWidgets = currentCategory
    ? currentCategory.widgetTypes.filter((wt) => enabledTypes.has(wt))
    : [];

  const containerStyle: React.CSSProperties = collapsed
    ? {}
    : panelHeight != null
      ? { height: panelHeight, minHeight: MIN_PANEL_HEIGHT, flexShrink: 0 }
      : { flex: "999 1 0%", minHeight: MIN_PANEL_HEIGHT };

  return (
    <div
      ref={containerRef}
      className="flex flex-col border-b wd-border-subtle bg-[var(--wd-surface-base)]"
      style={containerStyle}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex items-center gap-2 w-full px-4 py-2.5 transition-colors hover:bg-[var(--wd-surface-elevated)] shrink-0"
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
        <div className="flex flex-col flex-1 min-h-0">
          {availableCategories.length > 1 && (
            <div role="tablist" className="flex gap-0.5 px-3 pb-0 mb-3 border-b border-[var(--wd-border-subtle)] overflow-x-auto no-scrollbar shrink-0">
              {availableCategories.map((cat) => {
                const isActive = cat.id === activeCategory;
                const CatIcon = cat.icon;

                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap transition-all duration-150 relative ${
                      isActive
                        ? "text-[var(--wd-accent)]"
                        : "wd-text-muted hover:wd-text-primary"
                    }`}
                  >
                    <CatIcon size={12} />
                    {cat.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--wd-accent)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {enabledTypes.has("dota_session_pulse") && (
            <SessionPulseBanner
              workspaceId={workspaceId}
              channelId={roomId}
            />
          )}

          <div
            key={activeCategory}
            className="overflow-y-auto no-scrollbar animate-[wd-widget-card-in_0.2s_ease-out] flex-1 min-h-0"
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
                    variant={meta.variant}
                    headerExtra={meta.headerExtra}
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

          {/* Drag handle for resizing */}
          <div
            onMouseDown={handleDragStart}
            className="shrink-0 flex items-center justify-center cursor-row-resize group hover:bg-[var(--wd-surface-elevated)] transition-colors"
            style={{ height: DRAG_HANDLE_HEIGHT }}
          >
            <GripHorizontal
              size={14}
              className="wd-text-muted opacity-40 group-hover:opacity-80 transition-opacity"
            />
          </div>
        </div>
      )}
    </div>
  );
}
