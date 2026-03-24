import { create } from "zustand";
import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";
import type {
  ChannelWidgetConfig,
  DotaTrackedPlayer,
  SteamLinkedMember,
} from "@/common/components/ChannelWidgets/_types";

interface WidgetStoreState {
  configsByChannel: Record<string, ChannelWidgetConfig[]>;
  trackedPlayersByChannel: Record<string, DotaTrackedPlayer[]>;
  steamLinkedMembers: Record<string, SteamLinkedMember[]>;
  widgetDataByKey: Record<string, unknown>;
  activeWidgetTab: Record<string, string>;
  syncStatus: Record<string, "idle" | "syncing" | "done" | "error">;
  isLoading: boolean;

  fetchWidgetConfigs: (workspaceId: string, channelId: string) => Promise<void>;
  fetchTrackedPlayers: (workspaceId: string, channelId: string) => Promise<void>;
  fetchSteamLinkedMembers: (workspaceId: string) => Promise<void>;
  fetchWidgetData: (workspaceId: string, channelId: string, widgetType: string) => Promise<void>;
  addTrackedPlayer: (
    workspaceId: string,
    channelId: string,
    data: { steamId64: string; displayName: string; dotaAccountId: number; userId?: number },
  ) => Promise<void>;
  removeTrackedPlayer: (
    workspaceId: string,
    channelId: string,
    playerId: string,
  ) => Promise<void>;
  triggerSync: (workspaceId: string, channelId: string) => Promise<void>;
  setActiveWidgetTab: (channelId: string, widgetType: string) => void;

  handleMatchNew: (data: { matchId: string; channelId: string }) => void;
  handleSyncProgress: (data: { channelId: string; status: string }) => void;
  handleTiltAlert: (data: unknown) => void;
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

export const useWidgetStore = create<WidgetStoreState>((set, get) => ({
  configsByChannel: {},
  trackedPlayersByChannel: {},
  steamLinkedMembers: {},
  widgetDataByKey: {},
  activeWidgetTab: {},
  syncStatus: {},
  isLoading: false,

  async fetchWidgetConfigs(workspaceId, channelId) {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/channels/${channelId}/widgets`),
        { headers: authHeaders() },
      );
      if (!res.ok) return;
      const { widgets } = (await res.json()) as { widgets: ChannelWidgetConfig[] };
      set((s) => ({
        configsByChannel: { ...s.configsByChannel, [channelId]: widgets },
      }));

      const enabled = widgets.filter((w) => w.isEnabled);
      if (enabled.length > 0 && !get().activeWidgetTab[channelId]) {
        set((s) => ({
          activeWidgetTab: { ...s.activeWidgetTab, [channelId]: enabled[0]!.widgetType },
        }));
      }
    } catch {
      // silently fail
    }
  },

  async fetchTrackedPlayers(workspaceId, channelId) {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/channels/${channelId}/dota/tracked-players`),
        { headers: authHeaders() },
      );
      if (!res.ok) return;
      const { players } = (await res.json()) as { players: DotaTrackedPlayer[] };
      set((s) => ({
        trackedPlayersByChannel: { ...s.trackedPlayersByChannel, [channelId]: players },
      }));
    } catch {
      // silently fail
    }
  },

  async fetchSteamLinkedMembers(workspaceId) {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/dota/steam-linked-members`),
        { headers: authHeaders() },
      );
      if (!res.ok) return;
      const { members } = (await res.json()) as { members: SteamLinkedMember[] };
      set((s) => ({
        steamLinkedMembers: { ...s.steamLinkedMembers, [workspaceId]: members },
      }));
    } catch {
      // silently fail
    }
  },

  async fetchWidgetData(workspaceId, channelId, widgetType) {
    const key = `${channelId}:${widgetType}`;
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/channels/${channelId}/dota/widget-data/${widgetType}`),
        { headers: authHeaders() },
      );
      if (!res.ok) return;
      const { data } = (await res.json()) as { data: unknown };
      set((s) => ({
        widgetDataByKey: { ...s.widgetDataByKey, [key]: data },
      }));
    } catch {
      // silently fail
    }
  },

  async addTrackedPlayer(workspaceId, channelId, data) {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/channels/${channelId}/dota/tracked-players`),
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) return;
      await get().fetchTrackedPlayers(workspaceId, channelId);
    } catch {
      // silently fail
    }
  },

  async removeTrackedPlayer(workspaceId, channelId, playerId) {
    try {
      await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/channels/${channelId}/dota/tracked-players/${playerId}`),
        { method: "DELETE", headers: authHeaders() },
      );
      await get().fetchTrackedPlayers(workspaceId, channelId);
    } catch {
      // silently fail
    }
  },

  async triggerSync(workspaceId, channelId) {
    set((s) => ({
      syncStatus: { ...s.syncStatus, [channelId]: "syncing" },
    }));
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/channels/${channelId}/dota/sync`),
        { method: "POST", headers: authHeaders() },
      );
      if (res.ok) {
        set((s) => ({
          syncStatus: { ...s.syncStatus, [channelId]: "done" },
        }));
      } else {
        set((s) => ({
          syncStatus: { ...s.syncStatus, [channelId]: "error" },
        }));
      }
    } catch {
      set((s) => ({
        syncStatus: { ...s.syncStatus, [channelId]: "error" },
      }));
    }
  },

  setActiveWidgetTab(channelId, widgetType) {
    set((s) => ({
      activeWidgetTab: { ...s.activeWidgetTab, [channelId]: widgetType },
    }));
  },

  handleMatchNew(data) {
    // Trigger re-fetch of widget data for the affected channel
    const configs = get().configsByChannel[data.channelId];
    if (configs) {
      const activeTab = get().activeWidgetTab[data.channelId];
      if (activeTab) {
        // We don't have workspaceId here — the component should re-fetch
      }
    }
  },

  handleSyncProgress(data) {
    set((s) => ({
      syncStatus: {
        ...s.syncStatus,
        [data.channelId]: data.status as "idle" | "syncing" | "done" | "error",
      },
    }));
  },

  handleTiltAlert() {
    // Tilt alerts can be handled by the TiltDetector widget on next render
  },
}));
