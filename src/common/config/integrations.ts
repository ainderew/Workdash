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
