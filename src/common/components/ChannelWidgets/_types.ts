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
    avatarUrl: string | null;
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
  avatarUrl: string | null;
  severity: "warning" | "danger" | "critical";
  lossStreak: number;
  recentResults: ("W" | "L")[];
}

export interface PowerSpikeData {
  matchId: string;
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    heroId: number;
    goldAdvantage: number[];
    xpAdvantage: number[];
  }[];
}

export interface WardStatsData {
  players: {
    displayName: string;
    avatarUrl: string | null;
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
    avatarUrl: string | null;
    dotaAccountId: number;
    winRateOverTime: { date: string; winRate: number }[];
    mmrOverTime: { date: string; mmr: number }[];
    heroDiversity: { date: string; score: number }[];
  }[];
}

export interface ComfortPickData {
  players: {
    displayName: string;
    avatarUrl: string | null;
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
    avatarUrl: string | null;
    dotaAccountId: number;
    dataPoints: { date: string; avgDuration: number }[];
  }[];
  aggregate: { date: string; avgDuration: number }[];
}

export interface DamageCompositionData {
  players: {
    displayName: string;
    avatarUrl: string | null;
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
      avatarUrl: string | null;
      dotaAccountId: number;
      winRate: number;
      gamesPlayed: number;
      avgKda: number;
    }[];
  }[];
}

export interface ImpactScoreData {
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    impactScore: number;
    perMatchScores: number[];
    consistency: number;
    consistencyLabel: string;
  }[];
}

export interface WeeklyPowerRankingsData {
  rankings: {
    rank: number;
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    impactScore: number;
    winRate: number;
    gamesPlayed: number;
    rankDelta: number;
    bestHero: {
      heroId: number;
      heroName: string;
      heroIcon: string;
      games: number;
      winRate: number;
    };
    isMvp: boolean;
    isMostImproved: boolean;
  }[];
  weekStart: string;
  weekEnd: string;
}

export interface SessionPulseData {
  message: string;
  playerName: string;
  avatarUrl: string | null;
  dotaAccountId: number;
  statType: string;
  value: number;
}

export interface HotHandData {
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    score: number;
    label: string;
    recentResults: ("W" | "L")[];
  }[];
}

export interface ClutchFactorData {
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    clutchFactor: number;
    label: string;
    closeGameWinRate: number;
    normalWinRate: number;
    closeGamesPlayed: number;
  }[];
}

export interface TimePatternsData {
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    bestTimeSlot: { slot: string; winRate: number; games: number };
    worstTimeSlot: { slot: string; winRate: number; games: number };
    bestDay: { day: string; winRate: number; games: number };
    worstDay: { day: string; winRate: number; games: number };
    timeSlots: { slot: string; winRate: number; games: number }[];
    days: { day: string; winRate: number; games: number }[];
  }[];
}

export interface ThrowComebackData {
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    comebacks: number;
    throws: number;
    stomps: number;
    totalGames: number;
    throwRate: number;
    comebackRate: number;
  }[];
}

export interface HeadToHeadData {
  matchups: {
    playerA: { displayName: string; avatarUrl: string | null; dotaAccountId: number };
    playerB: { displayName: string; avatarUrl: string | null; dotaAccountId: number };
    sharedRoles: {
      role: string;
      playerAWinRate: number;
      playerAGames: number;
      playerAKda: number;
      playerBWinRate: number;
      playerBGames: number;
      playerBKda: number;
      winner: "A" | "B" | "tie";
    }[];
    gamesOnSameTeam: number;
    winRateTogether: number;
  }[];
}

export interface PeerSynergyData {
  pairs: {
    playerA: { displayName: string; avatarUrl: string | null; dotaAccountId: number };
    playerB: { displayName: string; avatarUrl: string | null; dotaAccountId: number };
    winRate: number;
    games: number;
    synergy: number;
    label: string;
  }[];
  bestDuo: { playerA: string; playerB: string; synergy: number } | null;
  worstDuo: { playerA: string; playerB: string; synergy: number } | null;
}

export interface HeroMasteryData {
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    topHeroes: {
      heroId: number;
      heroName: string;
      heroIcon: string;
      games: number;
      winRate: number;
    }[];
  }[];
  rivalries: {
    heroId: number;
    heroName: string;
    heroIcon: string;
    players: {
      displayName: string;
      avatarUrl: string | null;
      dotaAccountId: number;
      games: number;
      winRate: number;
    }[];
  }[];
}

export interface MatchRecapData {
  matchId: string;
  startTime: string;
  durationSec: number;
  radiantWin: boolean;
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    heroId: number;
    heroName: string;
    heroIcon: string;
    kills: number;
    deaths: number;
    assists: number;
    won: boolean;
    isMvp: boolean;
    highlights: string[];
  }[];
}

export interface MilestoneData {
  milestones: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    type: string;
    message: string;
    date: string;
    icon: string;
  }[];
}

export interface MonthlyAwardsData {
  month: string;
  awards: {
    title: string;
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    stat: string;
    icon: string;
  }[];
}

export interface SteamProfileData {
  players: {
    displayName: string;
    avatarUrl: string | null;
    dotaAccountId: number;
    steamId64: string;
    personaName: string | null;
    rankTier: number | null;
    mmrEstimate: number | null;
    totalGames: number;
    winRate: number;
    favoriteHero: {
      heroId: number;
      heroName: string;
      heroIcon: string;
      games: number;
    } | null;
  }[];
}
