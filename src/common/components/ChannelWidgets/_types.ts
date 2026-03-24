export interface ChannelWidgetConfig {
  id: string;
  channelId: string;
  widgetType: string;
  pluginType: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface DotaTrackedPlayer {
  id: string;
  workspaceId: string;
  channelId: string;
  dotaAccountId: number;
  steamId64: string;
  displayName: string;
  userId: number | null;
  addedBy: number;
  lastMatchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DotaMatchPlayer {
  id: string;
  matchId: string;
  dotaAccountId: number;
  heroId: number;
  playerSlot: number;
  isRadiant: boolean;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number;
  xpm: number;
  heroDamage: number;
  towerDamage: number;
  heroHealing: number;
  obsPlaced: number;
  senPlaced: number;
  obsKills: number;
  senKills: number;
  laneRole: number | null;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  itemNeutral: number;
  goldT: number[] | null;
  xpT: number[] | null;
}

export interface DotaMatch {
  matchId: string;
  durationSec: number;
  gameMode: number;
  lobbyType: number;
  radiantWin: boolean;
  startTime: string;
  avgMmr: number | null;
  radiantScore: number;
  direScore: number;
  players: DotaMatchPlayer[];
}

export interface SteamLinkedMember {
  userId: number;
  username: string;
  nickname: string | null;
  steamId64: string;
  dotaAccountId: number;
  personaName: string | null;
  rankTier: number | null;
  mmrEstimate: number | null;
}

export interface WidgetDefinition {
  widgetType: string;
  pluginType: string;
  label: string;
  icon: string;
  description: string;
}

export interface RolePerformanceData {
  players: {
    displayName: string;
    dotaAccountId: number;
    roles: {
      role: string;
      games: number;
      winRate: number;
    }[];
  }[];
}

export interface TiltStatus {
  dotaAccountId: number;
  displayName: string;
  severity: "warning" | "danger" | "critical";
  lossStreak: number;
  recentResults: ("W" | "L")[];
}

export interface PowerSpikeData {
  matchId: string;
  players: {
    displayName: string;
    dotaAccountId: number;
    heroId: number;
    goldAdvantage: number[];
    xpAdvantage: number[];
  }[];
}

export interface WardStatsData {
  players: {
    displayName: string;
    dotaAccountId: number;
    obsPlaced: number;
    senPlaced: number;
    obsKills: number;
    senKills: number;
    gamesPlayed: number;
  }[];
}

export interface TrendsData {
  players: {
    displayName: string;
    dotaAccountId: number;
    winRateOverTime: { date: string; winRate: number }[];
    mmrOverTime: { date: string; mmr: number }[];
    heroDiversity: { date: string; score: number }[];
  }[];
}

export interface ComfortPickData {
  players: {
    displayName: string;
    dotaAccountId: number;
    heroes: {
      heroId: number;
      heroName: string;
      heroIcon: string;
      winRate: number;
      gamesPlayed: number;
    }[];
  }[];
}

export interface AvgMatchLengthData {
  players: {
    displayName: string;
    dotaAccountId: number;
    dataPoints: { date: string; avgDuration: number }[];
  }[];
  aggregate: { date: string; avgDuration: number }[];
}

export interface DamageCompositionData {
  players: {
    displayName: string;
    dotaAccountId: number;
    physical: number;
    magical: number;
    pure: number;
  }[];
}

export interface TeamLeaderboardData {
  roles: {
    role: string;
    rankings: {
      displayName: string;
      dotaAccountId: number;
      winRate: number;
      gamesPlayed: number;
      avgKda: number;
    }[];
  }[];
}
