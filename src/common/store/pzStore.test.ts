import { describe, it, expect, beforeEach } from "vitest";
import { usePZStore } from "./pzStore";
import type { PZPlayer, PZDeathEvent, PZActivityEvent } from "./pzStore";

function makePlayer(overrides: Partial<PZPlayer> = {}): PZPlayer {
  return {
    steamId: "steam-1",
    pzUsername: "Survivor",
    workdashUser: null,
    kills: 0,
    deaths: 0,
    survivalTime: 0,
    ...overrides,
  };
}

function makeDeathEvent(overrides: Partial<PZDeathEvent> = {}): PZDeathEvent {
  return {
    id: `death-${Math.random()}`,
    username: "Survivor",
    action: "was eaten by zombies",
    timestamp: new Date().toISOString(),
    isPvp: false,
    workdashUser: null,
    ...overrides,
  };
}

function makeActivityEvent(
  overrides: Partial<PZActivityEvent> = {},
): PZActivityEvent {
  return {
    id: `activity-${Math.random()}`,
    type: "player_connect",
    username: "Survivor",
    action: "joined the server",
    timestamp: new Date().toISOString(),
    workdashUser: null,
    ...overrides,
  };
}

describe("pzStore", () => {
  beforeEach(() => {
    localStorage.clear();
    usePZStore.setState({
      isServerOnline: false,
      onlinePlayers: [],
      lastEventAt: null,
      allPlayerStats: [],
      leaderboardTab: "kills",
      recentDeaths: [],
      recentActivity: [],
      isSidebarOpen: true,
      sectionStates: {
        status: true,
        leaderboard: true,
        deaths: true,
        activity: true,
      },
      isLoading: false,
    });
  });

  describe("toggleSidebar", () => {
    it("flips isSidebarOpen and persists to localStorage", () => {
      expect(usePZStore.getState().isSidebarOpen).toBe(true);

      usePZStore.getState().toggleSidebar();
      expect(usePZStore.getState().isSidebarOpen).toBe(false);
      expect(localStorage.getItem("pz-sidebar-open")).toBe("false");

      usePZStore.getState().toggleSidebar();
      expect(usePZStore.getState().isSidebarOpen).toBe(true);
      expect(localStorage.getItem("pz-sidebar-open")).toBe("true");
    });
  });

  describe("toggleSection", () => {
    it("flips individual section states", () => {
      expect(usePZStore.getState().sectionStates.status).toBe(true);

      usePZStore.getState().toggleSection("status");
      expect(usePZStore.getState().sectionStates.status).toBe(false);
      expect(localStorage.getItem("pz-section-status")).toBe("false");

      usePZStore.getState().toggleSection("status");
      expect(usePZStore.getState().sectionStates.status).toBe(true);
      expect(localStorage.getItem("pz-section-status")).toBe("true");
    });
  });

  describe("addDeathEvent", () => {
    it("prepends to recentDeaths", () => {
      const event1 = makeDeathEvent({ id: "d1" });
      const event2 = makeDeathEvent({ id: "d2" });

      usePZStore.getState().addDeathEvent(event1);
      usePZStore.getState().addDeathEvent(event2);

      const deaths = usePZStore.getState().recentDeaths;
      expect(deaths[0].id).toBe("d2");
      expect(deaths[1].id).toBe("d1");
    });

    it("caps at 50 events", () => {
      for (let i = 0; i < 55; i++) {
        usePZStore.getState().addDeathEvent(makeDeathEvent({ id: `d-${i}` }));
      }

      expect(usePZStore.getState().recentDeaths).toHaveLength(50);
      expect(usePZStore.getState().recentDeaths[0].id).toBe("d-54");
    });
  });

  describe("addActivityEvent", () => {
    it("prepends to recentActivity", () => {
      const event1 = makeActivityEvent({ id: "a1" });
      const event2 = makeActivityEvent({ id: "a2" });

      usePZStore.getState().addActivityEvent(event1);
      usePZStore.getState().addActivityEvent(event2);

      const activity = usePZStore.getState().recentActivity;
      expect(activity[0].id).toBe("a2");
      expect(activity[1].id).toBe("a1");
    });

    it("caps at 50 events", () => {
      for (let i = 0; i < 55; i++) {
        usePZStore
          .getState()
          .addActivityEvent(makeActivityEvent({ id: `a-${i}` }));
      }

      expect(usePZStore.getState().recentActivity).toHaveLength(50);
      expect(usePZStore.getState().recentActivity[0].id).toBe("a-54");
    });
  });

  describe("updateOnlinePlayer", () => {
    it("adds player when connected is true", () => {
      const player = makePlayer({ steamId: "s1" });

      usePZStore.getState().updateOnlinePlayer("s1", true, player);

      expect(usePZStore.getState().onlinePlayers).toHaveLength(1);
      expect(usePZStore.getState().onlinePlayers[0].steamId).toBe("s1");
    });

    it("does not duplicate player on repeated connect", () => {
      const player = makePlayer({ steamId: "s1" });

      usePZStore.getState().updateOnlinePlayer("s1", true, player);
      usePZStore.getState().updateOnlinePlayer("s1", true, player);

      expect(usePZStore.getState().onlinePlayers).toHaveLength(1);
    });

    it("removes player when connected is false", () => {
      const player = makePlayer({ steamId: "s1" });
      usePZStore.setState({ onlinePlayers: [player] });

      usePZStore.getState().updateOnlinePlayer("s1", false, player);

      expect(usePZStore.getState().onlinePlayers).toHaveLength(0);
    });
  });

  describe("setLeaderboardTab", () => {
    it("updates active tab", () => {
      expect(usePZStore.getState().leaderboardTab).toBe("kills");

      usePZStore.getState().setLeaderboardTab("deaths");
      expect(usePZStore.getState().leaderboardTab).toBe("deaths");

      usePZStore.getState().setLeaderboardTab("survived");
      expect(usePZStore.getState().leaderboardTab).toBe("survived");
    });
  });
});
