import { describe, it, expect, beforeEach } from "vitest";
import useMusicStore from "./musicStore";

// ─── Helpers ────────────────────────────────────────────────────────────────

const WS_1 = "ws-1";
const WS_2 = "ws-2";

function makeSession(overrides = {}) {
  return {
    state: "playing" as const,
    currentTrack: { title: "Test Track", duration: 120, requestedBy: "Alice" },
    queueLength: 2,
    volume: 80,
    listenerCount: 3,
    ...overrides,
  };
}

function makeQueuedTrack(title = "Queued Track") {
  return { title, duration: 200, requestedBy: "Bob" };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("useMusicStore", () => {
  beforeEach(() => {
    useMusicStore.setState({
      sessionsByWorkspace: {},
      queuesByWorkspace: {},
      listeningWorkspaces: new Set(),
    });
  });

  // ================================================================
  // Session management
  // ================================================================

  describe("setSession / getSession", () => {
    it("should store and retrieve a session for a workspace", () => {
      const session = makeSession();
      useMusicStore.getState().setSession(WS_1, session);
      expect(useMusicStore.getState().getSession(WS_1)).toEqual(session);
    });

    it("should return null for unknown workspace", () => {
      expect(useMusicStore.getState().getSession("nonexistent")).toBeNull();
    });

    it("should not clobber sessions from other workspaces", () => {
      const s1 = makeSession({ volume: 50 });
      const s2 = makeSession({ volume: 90 });
      useMusicStore.getState().setSession(WS_1, s1);
      useMusicStore.getState().setSession(WS_2, s2);

      expect(useMusicStore.getState().getSession(WS_1)?.volume).toBe(50);
      expect(useMusicStore.getState().getSession(WS_2)?.volume).toBe(90);
    });

    it("should update an existing session in place", () => {
      useMusicStore.getState().setSession(WS_1, makeSession({ state: "playing" }));
      useMusicStore.getState().setSession(WS_1, makeSession({ state: "paused" }));
      expect(useMusicStore.getState().getSession(WS_1)?.state).toBe("paused");
    });
  });

  // ================================================================
  // removeSession
  // ================================================================

  describe("removeSession", () => {
    it("should remove session, queue, and listening state", () => {
      useMusicStore.getState().setSession(WS_1, makeSession());
      useMusicStore.getState().setQueue(WS_1, [makeQueuedTrack()]);
      useMusicStore.getState().setListening(WS_1, true);

      useMusicStore.getState().removeSession(WS_1);

      expect(useMusicStore.getState().getSession(WS_1)).toBeNull();
      expect(useMusicStore.getState().queuesByWorkspace[WS_1]).toBeUndefined();
      expect(useMusicStore.getState().isListening(WS_1)).toBe(false);
    });

    it("should not affect other workspaces", () => {
      useMusicStore.getState().setSession(WS_1, makeSession());
      useMusicStore.getState().setSession(WS_2, makeSession());

      useMusicStore.getState().removeSession(WS_1);

      expect(useMusicStore.getState().getSession(WS_1)).toBeNull();
      expect(useMusicStore.getState().getSession(WS_2)).not.toBeNull();
    });
  });

  // ================================================================
  // Listening state
  // ================================================================

  describe("setListening / isListening", () => {
    it("should track listening state per workspace", () => {
      useMusicStore.getState().setListening(WS_1, true);
      expect(useMusicStore.getState().isListening(WS_1)).toBe(true);
      expect(useMusicStore.getState().isListening(WS_2)).toBe(false);
    });

    it("should remove listening state when set to false", () => {
      useMusicStore.getState().setListening(WS_1, true);
      useMusicStore.getState().setListening(WS_1, false);
      expect(useMusicStore.getState().isListening(WS_1)).toBe(false);
    });
  });

  // ================================================================
  // Queue management
  // ================================================================

  describe("setQueue / clearQueue", () => {
    it("should store queue for a workspace", () => {
      const queue = [makeQueuedTrack("Track 1"), makeQueuedTrack("Track 2")];
      useMusicStore.getState().setQueue(WS_1, queue);
      expect(useMusicStore.getState().queuesByWorkspace[WS_1]).toEqual(queue);
    });

    it("should clear queue for a workspace", () => {
      useMusicStore.getState().setQueue(WS_1, [makeQueuedTrack()]);
      useMusicStore.getState().clearQueue(WS_1);
      expect(useMusicStore.getState().queuesByWorkspace[WS_1]).toBeUndefined();
    });

    it("should not affect other workspace queues", () => {
      useMusicStore.getState().setQueue(WS_1, [makeQueuedTrack("Track A")]);
      useMusicStore.getState().setQueue(WS_2, [makeQueuedTrack("Track B")]);

      useMusicStore.getState().clearQueue(WS_1);

      expect(useMusicStore.getState().queuesByWorkspace[WS_1]).toBeUndefined();
      expect(useMusicStore.getState().queuesByWorkspace[WS_2]).toHaveLength(1);
    });
  });
});
