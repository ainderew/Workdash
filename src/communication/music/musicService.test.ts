import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock musicStore before importing ───────────────────────────────────────

const mockSetSession = vi.fn();
const mockRemoveSession = vi.fn();
const mockGetSession = vi.fn().mockReturnValue(null);
const mockSetListening = vi.fn();
const mockSetQueue = vi.fn();

vi.mock("@/common/store/musicStore", () => ({
  default: {
    getState: () => ({
      setSession: mockSetSession,
      removeSession: mockRemoveSession,
      getSession: mockGetSession,
      setListening: mockSetListening,
      setQueue: mockSetQueue,
      listeningWorkspaces: new Set(["ws-1"]),
    }),
  },
}));

import { MusicClientService } from "./musicService";

// ─── Helpers ────────────────────────────────────────────────────────────────

type SocketHandler = (...args: unknown[]) => void;

function makeMockSocket() {
  const handlers = new Map<string, SocketHandler>();
  return {
    on: vi.fn((event: string, handler: SocketHandler) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    off: vi.fn(),
    _trigger(event: string, ...args: unknown[]) {
      const handler = handlers.get(event);
      if (handler) handler(...args);
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("MusicClientService", () => {
  let socket: ReturnType<typeof makeMockSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (MusicClientService as unknown as { instance: null }).instance = null;
    socket = makeMockSocket();
  });

  describe("setupListeners", () => {
    it("should register all music event listeners on the socket", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      const registeredEvents = socket.on.mock.calls.map((c: unknown[]) => c[0]);
      expect(registeredEvents).toContain("music:state-changed");
      expect(registeredEvents).toContain("music:track-started");
      expect(registeredEvents).toContain("music:session-ended");
      expect(registeredEvents).toContain("music:subscribed");
      expect(registeredEvents).toContain("music:queue-updated");
      expect(registeredEvents).toContain("music:listener-update");
      expect(registeredEvents).toContain("reconnect");
    });

    it("should not register listeners twice", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();
      const callCount = socket.on.mock.calls.length;

      service.setupListeners(); // second call
      expect(socket.on.mock.calls.length).toBe(callCount); // no new registrations
    });
  });

  describe("music:state-changed handler", () => {
    it("should update store session on state-changed event", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      const payload = {
        workspaceId: "ws-1",
        state: "playing" as const,
        currentTrack: { title: "Song", duration: 120, requestedBy: "Alice" },
        queueLength: 3,
        volume: 80,
        listenerCount: 2,
      };

      socket._trigger("music:state-changed", payload);

      expect(mockSetSession).toHaveBeenCalledWith("ws-1", {
        state: "playing",
        currentTrack: payload.currentTrack,
        queueLength: 3,
        volume: 80,
        listenerCount: 2,
        shuffle: false,
        repeatMode: "off",
      });
    });
  });

  describe("music:session-ended handler", () => {
    it("should remove session from store", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      socket._trigger("music:session-ended", { workspaceId: "ws-1" });

      expect(mockRemoveSession).toHaveBeenCalledWith("ws-1");
    });
  });

  describe("music:subscribed handler", () => {
    it("should set listening state to true", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      socket._trigger("music:subscribed", { workspaceId: "ws-1" });

      expect(mockSetListening).toHaveBeenCalledWith("ws-1", true);
    });
  });

  describe("music:queue-updated handler", () => {
    it("should update queue in store", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      const queue = [
        { title: "Track 1", duration: 100, requestedBy: "Alice" },
        { title: "Track 2", duration: 200, requestedBy: "Bob" },
      ];
      socket._trigger("music:queue-updated", { workspaceId: "ws-1", queue });

      expect(mockSetQueue).toHaveBeenCalledWith("ws-1", queue);
    });
  });

  describe("music:listener-update handler", () => {
    it("should update listener count in existing session", () => {
      mockGetSession.mockReturnValue({
        state: "playing",
        currentTrack: { title: "Song" },
        queueLength: 1,
        volume: 80,
        listenerCount: 2,
      });

      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      socket._trigger("music:listener-update", { workspaceId: "ws-1", listenerCount: 5 });

      expect(mockSetSession).toHaveBeenCalledWith("ws-1", expect.objectContaining({
        listenerCount: 5,
      }));
    });

    it("should not update if no session exists", () => {
      mockGetSession.mockReturnValue(null);

      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      socket._trigger("music:listener-update", { workspaceId: "ws-1", listenerCount: 5 });

      expect(mockSetSession).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("should emit music:subscribe with workspaceId", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.subscribe("ws-1");

      expect(socket.emit).toHaveBeenCalledWith(
        "music:subscribe",
        { workspaceId: "ws-1" },
        expect.any(Function),
      );
    });

    it("should set listening on success callback", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.subscribe("ws-1");

      // Get the callback and invoke it
      const callback = socket.emit.mock.calls[0][2] as (res: unknown) => void;
      callback({ producerId: "prod-1" });

      expect(mockSetListening).toHaveBeenCalledWith("ws-1", true);
    });

    it("should not set listening on error callback", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.subscribe("ws-1");

      const callback = socket.emit.mock.calls[0][2] as (res: unknown) => void;
      callback({ error: "No active music session" });

      expect(mockSetListening).not.toHaveBeenCalled();
    });
  });

  describe("unsubscribe", () => {
    it("should emit music:unsubscribe and set listening false on success", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.unsubscribe("ws-1");

      expect(socket.emit).toHaveBeenCalledWith(
        "music:unsubscribe",
        { workspaceId: "ws-1" },
        expect.any(Function),
      );

      const callback = socket.emit.mock.calls[0][2] as (res: unknown) => void;
      callback({ ok: true });

      expect(mockSetListening).toHaveBeenCalledWith("ws-1", false);
    });
  });

  describe("fetchState", () => {
    it("should emit music:get-state and update store on success", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.fetchState("ws-1");

      expect(socket.emit).toHaveBeenCalledWith(
        "music:get-state",
        { workspaceId: "ws-1" },
        expect.any(Function),
      );

      const callback = socket.emit.mock.calls[0][2] as (res: unknown) => void;
      callback({
        ok: true,
        data: {
          state: "playing",
          currentTrack: { title: "Song", requestedBy: "Alice" },
          queueLength: 1,
          volume: 80,
          listenerCount: 2,
        },
      });

      expect(mockSetSession).toHaveBeenCalledWith("ws-1", expect.objectContaining({
        state: "playing",
      }));
    });

    it("should not update store when response is not ok", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.fetchState("ws-1");

      const callback = socket.emit.mock.calls[0][2] as (res: unknown) => void;
      callback({ ok: false, error: "Not in workspace" });

      expect(mockSetSession).not.toHaveBeenCalled();
    });
  });

  describe("togglePlayback", () => {
    it("should emit music:toggle-playback with workspaceId", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.togglePlayback("ws-1");

      expect(socket.emit).toHaveBeenCalledWith(
        "music:toggle-playback",
        { workspaceId: "ws-1" },
        expect.any(Function),
      );
    });

    it("should not throw on error callback", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.togglePlayback("ws-1");

      const callback = socket.emit.mock.calls[0][2] as (res: unknown) => void;
      expect(() => callback({ error: "No permission" })).not.toThrow();
    });
  });

  describe("skip", () => {
    it("should emit music:skip with workspaceId", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.skip("ws-1");

      expect(socket.emit).toHaveBeenCalledWith(
        "music:skip",
        { workspaceId: "ws-1" },
        expect.any(Function),
      );
    });

    it("should not throw on error callback", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket);

      service.skip("ws-1");

      const callback = socket.emit.mock.calls[0][2] as (res: unknown) => void;
      expect(() => callback({ error: "No active session" })).not.toThrow();
    });
  });

  describe("resubscribeAll", () => {
    it("should re-subscribe to all listening workspaces on reconnect", () => {
      const service = MusicClientService.getInstance();
      service.init(socket as unknown as SocketIOClient.Socket).setupListeners();

      socket._trigger("reconnect");

      // listeningWorkspaces has "ws-1", so subscribe should be called
      expect(socket.emit).toHaveBeenCalledWith(
        "music:subscribe",
        { workspaceId: "ws-1" },
        expect.any(Function),
      );
    });
  });
});
