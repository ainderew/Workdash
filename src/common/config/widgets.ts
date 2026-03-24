import type { WidgetDefinition } from "@/common/components/ChannelWidgets/_types";

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    widgetType: "dota_team_leaderboard",
    pluginType: "dota2",
    label: "Team Leaderboard",
    icon: "Trophy",
    description: "Per-role rankings — who's the best carry, mid, support on your team",
  },
  {
    widgetType: "dota_role_performance",
    pluginType: "dota2",
    label: "Role Performance",
    icon: "Shield",
    description: "Win rates by role for each tracked player",
  },
  {
    widgetType: "dota_tilt_detector",
    pluginType: "dota2",
    label: "Tilt Detector",
    icon: "AlertTriangle",
    description: "Loss streak alerts and tilt severity tracking",
  },
  {
    widgetType: "dota_power_spikes",
    pluginType: "dota2",
    label: "Power Spikes",
    icon: "Zap",
    description: "Gold and XP advantage over time per match",
  },
  {
    widgetType: "dota_ward_stats",
    pluginType: "dota2",
    label: "Ward Stats",
    icon: "Eye",
    description: "Observer and sentry ward placement stats",
  },
  {
    widgetType: "dota_trends",
    pluginType: "dota2",
    label: "Trends Dashboard",
    icon: "TrendingUp",
    description: "MMR trajectory, win rate, and hero diversity over time",
  },
  {
    widgetType: "dota_comfort_picks",
    pluginType: "dota2",
    label: "Comfort Picks",
    icon: "ThumbsDown",
    description: "Heroes with low win rates per player",
  },
  {
    widgetType: "dota_avg_match_length",
    pluginType: "dota2",
    label: "Avg Match Length",
    icon: "Clock",
    description: "Rolling average match duration over time",
  },
  {
    widgetType: "dota_damage_composition",
    pluginType: "dota2",
    label: "Damage Composition",
    icon: "Flame",
    description: "Physical, magical, and pure damage split per player",
  },
];

export const WIDGET_PLUGINS = {
  dota2: {
    label: "Dota 2",
    icon: "Swords",
    widgets: AVAILABLE_WIDGETS.filter((w) => w.pluginType === "dota2"),
  },
} as const;
