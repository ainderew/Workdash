import { create } from "zustand";
import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";

export interface PZPlayer {
  steamId: string;
  pzUsername: string;
  workdashUser: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  kills: number;
  deaths: number;
  survivalTime: number;
}

export interface PZDeathEvent {
  id: string;
  username: string;
  action: string;
  timestamp: string;
  isPvp: boolean;
  workdashUser: { displayName: string; avatarUrl: string | null } | null;
}

export interface PZActivityEvent {
  id: string;
  type: string;
  username: string;
  action: string;
  timestamp: string;
  workdashUser: { displayName: string; avatarUrl: string | null } | null;
}

interface StatusResponse {
  isOnline: boolean;
  lastEventAt: string | null;
  playerCount: number;
}

interface OnlinePlayerResponse {
  steamId: string;
  pzUsername: string;
  workdashUser: PZPlayer["workdashUser"];
}

interface StatsPlayerResponse {
  steamId: string;
  pzUsername: string;
  kills: number;
  deaths: number;
  survivalTime: number;
  workdashUser: PZPlayer["workdashUser"];
}

type LeaderboardTab = "kills" | "deaths" | "survived";

interface SectionStates {
  status: boolean;
  leaderboard: boolean;
  deaths: boolean;
  activity: boolean;
}

interface PZStoreState {
  isServerOnline: boolean;
  onlinePlayers: PZPlayer[];
  lastEventAt: string | null;

  allPlayerStats: PZPlayer[];
  leaderboardTab: LeaderboardTab;

  recentDeaths: PZDeathEvent[];
  recentActivity: PZActivityEvent[];

  isSidebarOpen: boolean;
  sectionStates: SectionStates;

  isLoading: boolean;
  fetchError: string | null;

  setLeaderboardTab: (tab: LeaderboardTab) => void;
  toggleSidebar: () => void;
  toggleSection: (section: keyof SectionStates) => void;
  setServerData: (data: Partial<PZStoreState>) => void;
  addDeathEvent: (event: PZDeathEvent) => void;
  addActivityEvent: (event: PZActivityEvent) => void;
  updateOnlinePlayer: (steamId: string, connected: boolean, player: PZPlayer) => void;
  fetchAllData: (workspaceId: string) => Promise<void>;
}

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === "true";
}

function saveBool(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(value));
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getJwt()}`,
  };
}

function apiUrl(path: string): string {
  return `${CONFIG.SFU_SERVER_URL}${path}`;
}

const MAX_FEED_SIZE = 50;

export const usePZStore = create<PZStoreState>((set, get) => ({
  isServerOnline: false,
  onlinePlayers: [],
  lastEventAt: null,

  allPlayerStats: [],
  leaderboardTab: "kills",

  recentDeaths: [],
  recentActivity: [],

  isSidebarOpen: loadBool("pz-sidebar-open", true),
  sectionStates: {
    status: loadBool("pz-section-status", true),
    leaderboard: loadBool("pz-section-leaderboard", true),
    deaths: loadBool("pz-section-deaths", true),
    activity: loadBool("pz-section-activity", true),
  },

  isLoading: false,
  fetchError: null,

  setLeaderboardTab: (tab) => set({ leaderboardTab: tab }),

  toggleSidebar: () => {
    const next = !get().isSidebarOpen;
    saveBool("pz-sidebar-open", next);
    set({ isSidebarOpen: next });
  },

  toggleSection: (section) => {
    const current = get().sectionStates;
    const next = { ...current, [section]: !current[section] };
    saveBool(`pz-section-${section}`, next[section]);
    set({ sectionStates: next });
  },

  setServerData: (data) => set(data),

  addDeathEvent: (event) => {
    const deaths = [event, ...get().recentDeaths].slice(0, MAX_FEED_SIZE);
    set({ recentDeaths: deaths });
  },

  addActivityEvent: (event) => {
    const activity = [event, ...get().recentActivity].slice(0, MAX_FEED_SIZE);
    set({ recentActivity: activity });
  },

  updateOnlinePlayer: (steamId, connected, player) => {
    const current = get().onlinePlayers;
    if (connected) {
      const exists = current.some((p) => p.steamId === steamId);
      if (!exists) {
        set({ onlinePlayers: [...current, player] });
      }
    } else {
      set({ onlinePlayers: current.filter((p) => p.steamId !== steamId) });
    }
  },

  async fetchAllData(workspaceId: string) {
    set({ isLoading: true, fetchError: null });
    try {
      const [statusRes, onlineRes, statsRes, deathsRes, feedRes] =
        await Promise.all([
          fetch(apiUrl(`/api/workspaces/${workspaceId}/pz/status`), {
            headers: authHeaders(),
          }),
          fetch(apiUrl(`/api/workspaces/${workspaceId}/pz/online`), {
            headers: authHeaders(),
          }),
          fetch(apiUrl(`/api/workspaces/${workspaceId}/pz/stats`), {
            headers: authHeaders(),
          }),
          fetch(apiUrl(`/api/workspaces/${workspaceId}/pz/deaths?limit=20`), {
            headers: authHeaders(),
          }),
          fetch(apiUrl(`/api/workspaces/${workspaceId}/pz/feed?limit=30`), {
            headers: authHeaders(),
          }),
        ]);

      const responses = [
        { name: "status", res: statusRes },
        { name: "online", res: onlineRes },
        { name: "stats", res: statsRes },
        { name: "deaths", res: deathsRes },
        { name: "feed", res: feedRes },
      ];
      const failedEndpoints = responses
        .filter((r) => !r.res.ok)
        .map((r) => r.name);

      const [status, online, stats, deaths, feed] = await Promise.all([
        statusRes.ok ? (statusRes.json() as Promise<StatusResponse>) : null,
        onlineRes.ok
          ? (onlineRes.json() as Promise<{ players: OnlinePlayerResponse[] }>)
          : null,
        statsRes.ok
          ? (statsRes.json() as Promise<{ players: StatsPlayerResponse[] }>)
          : null,
        deathsRes.ok
          ? (deathsRes.json() as Promise<{ deaths: PZDeathEvent[] }>)
          : null,
        feedRes.ok
          ? (feedRes.json() as Promise<{ events: PZActivityEvent[] }>)
          : null,
      ]);

      const fetchError = failedEndpoints.length > 0
        ? `Failed to load: ${failedEndpoints.join(", ")}`
        : null;

      set({
        isServerOnline: status?.isOnline ?? false,
        lastEventAt: status?.lastEventAt ?? null,
        onlinePlayers: (online?.players ?? []).map((p) => ({
          steamId: p.steamId,
          pzUsername: p.pzUsername,
          workdashUser: p.workdashUser,
          kills: 0,
          deaths: 0,
          survivalTime: 0,
        })),
        allPlayerStats: (stats?.players ?? []).map((p) => ({
          steamId: p.steamId,
          pzUsername: p.pzUsername,
          workdashUser: p.workdashUser,
          kills: p.kills ?? 0,
          deaths: p.deaths ?? 0,
          survivalTime: p.survivalTime ?? 0,
        })),
        recentDeaths: deaths?.deaths ?? [],
        recentActivity: feed?.events ?? [],
        isLoading: false,
        fetchError,
      });
    } catch (err) {
      set({
        isLoading: false,
        fetchError:
          err instanceof Error ? err.message : "Failed to load PZ data",
      });
    }
  },
}));
