export interface IntegrationDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  hasWebhook: boolean;
  configFields: IntegrationConfigField[];
}

export interface IntegrationConfigField {
  key: string;
  label: string;
  type: "channelMap" | "text" | "boolean";
}

export const AVAILABLE_INTEGRATIONS: IntegrationDefinition[] = [
  {
    type: "pz_server",
    name: "Project Zomboid Server",
    description:
      "Live server stats, death log, and activity feed from your PZ dedicated server",
    icon: "🧟",
    hasWebhook: true,
    configFields: [
      { key: "channelMap", label: "Channel Routing", type: "channelMap" },
    ],
  },
  {
    type: "dota2",
    name: "Dota 2 Stats",
    description: "Match summaries, leaderboards, and live player status",
    icon: "🎮",
    hasWebhook: false,
    configFields: [],
  },
  {
    type: "github",
    name: "GitHub",
    description: "Commit and PR notifications",
    icon: "🔗",
    hasWebhook: true,
    configFields: [
      { key: "channelMap", label: "Channel Routing", type: "channelMap" },
    ],
  },
];

export const PZ_EVENT_TYPE_LABELS: Record<string, string> = {
  player_death: "Player Deaths",
  pvp_kill: "PvP Kills",
  player_connect: "Player Connected",
  player_disconnect: "Player Disconnected",
  player_craft: "Crafting",
  item_pickup: "Item Pickup",
  base_build: "Base Building",
  safehouse_event: "Safehouse Events",
  admin_command: "Admin Commands",
  map_change: "Map Changes",
  default: "All Other Events",
};
