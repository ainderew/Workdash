import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWidgetStore } from "./widgetStore";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock tokenStore
vi.mock("@/common/utils/tokenStore", () => ({
  tokenStore: { getJwt: () => "test-jwt" },
}));

// Mock config
vi.mock("@/common/utils/config", () => ({
  CONFIG: { SFU_SERVER_URL: "http://localhost:4000" },
}));

describe("widgetStore", () => {
  beforeEach(() => {
    useWidgetStore.setState({
      configsByChannel: {},
      trackedPlayersByChannel: {},
      steamLinkedMembers: {},
      widgetDataByKey: {},
      activeWidgetTab: {},
      syncStatus: {},
      isLoading: false,
    });
    mockFetch.mockReset();
  });

  it("should have initial state", () => {
    const state = useWidgetStore.getState();
    expect(state.configsByChannel).toEqual({});
    expect(state.trackedPlayersByChannel).toEqual({});
    expect(state.widgetDataByKey).toEqual({});
    expect(state.activeWidgetTab).toEqual({});
    expect(state.syncStatus).toEqual({});
  });

  it("should set active widget tab", () => {
    useWidgetStore.getState().setActiveWidgetTab("channel-1", "dota_tilt_detector");
    expect(useWidgetStore.getState().activeWidgetTab["channel-1"]).toBe("dota_tilt_detector");
  });

  it("should fetch widget configs and set first enabled as active", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        widgets: [
          { id: "w1", widgetType: "dota_role_performance", isEnabled: true, position: 0 },
          { id: "w2", widgetType: "dota_tilt_detector", isEnabled: false, position: 1 },
        ],
      }),
    });

    await useWidgetStore.getState().fetchWidgetConfigs("ws-1", "ch-1");

    const state = useWidgetStore.getState();
    expect(state.configsByChannel["ch-1"]).toHaveLength(2);
    expect(state.activeWidgetTab["ch-1"]).toBe("dota_role_performance");
  });

  it("should not override existing active tab on re-fetch", async () => {
    useWidgetStore.getState().setActiveWidgetTab("ch-1", "dota_ward_stats");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        widgets: [
          { id: "w1", widgetType: "dota_role_performance", isEnabled: true, position: 0 },
        ],
      }),
    });

    await useWidgetStore.getState().fetchWidgetConfigs("ws-1", "ch-1");
    expect(useWidgetStore.getState().activeWidgetTab["ch-1"]).toBe("dota_ward_stats");
  });

  it("should fetch tracked players", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        players: [
          { id: "p1", displayName: "Player 1", dotaAccountId: 123 },
        ],
      }),
    });

    await useWidgetStore.getState().fetchTrackedPlayers("ws-1", "ch-1");
    expect(useWidgetStore.getState().trackedPlayersByChannel["ch-1"]).toHaveLength(1);
  });

  it("should fetch widget data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { players: [] } }),
    });

    await useWidgetStore.getState().fetchWidgetData("ws-1", "ch-1", "dota_tilt_detector");
    expect(useWidgetStore.getState().widgetDataByKey["ch-1:dota_tilt_detector"]).toEqual({ players: [] });
  });

  it("should handle sync status transitions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ synced: true, newMatches: 3 }),
    });

    const promise = useWidgetStore.getState().triggerSync("ws-1", "ch-1");
    expect(useWidgetStore.getState().syncStatus["ch-1"]).toBe("syncing");

    await promise;
    expect(useWidgetStore.getState().syncStatus["ch-1"]).toBe("done");
  });

  it("should set error sync status on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    await useWidgetStore.getState().triggerSync("ws-1", "ch-1");
    expect(useWidgetStore.getState().syncStatus["ch-1"]).toBe("error");
  });

  it("should handle handleSyncProgress", () => {
    useWidgetStore.getState().handleSyncProgress({ channelId: "ch-1", status: "syncing" });
    expect(useWidgetStore.getState().syncStatus["ch-1"]).toBe("syncing");
  });

  it("should silently handle fetch failure for configs", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    await useWidgetStore.getState().fetchWidgetConfigs("ws-1", "ch-1");
    expect(useWidgetStore.getState().configsByChannel["ch-1"]).toBeUndefined();
  });
});
