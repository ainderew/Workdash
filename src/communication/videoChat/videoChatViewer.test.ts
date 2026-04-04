import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mocks ───────────────────────────────────────────────────────────��──

const mockSocketOn = vi.fn();
const mockSocket = { on: mockSocketOn, emit: vi.fn(), off: vi.fn() };

function makeConsumer(id: string) {
  return {
    id,
    closed: false,
    close: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    track: {
      readyState: "live" as MediaStreamTrackState,
      onended: null as (() => void) | null,
    },
  };
}

vi.mock("@/communication/mediaTransportService/mediaTransportService", () => ({
  MediaTransportService: {
    getInstance: vi.fn(() => ({
      socket: mockSocket,
      device: { rtpCapabilities: {} },
      recvTransport: { id: "recv-transport", consume: vi.fn() },
    })),
  },
}));

const mockUpdateUser = vi.fn();
vi.mock("@/common/store/useStore", () => ({
  default: {
    getState: vi.fn(() => ({
      user: { producerIds: [] },
      updateUser: mockUpdateUser,
    })),
  },
}));

vi.mock("@/common/store/playerStore", () => ({
  default: {
    getState: vi.fn(() => ({ playerMap: {} })),
  },
}));

const mockRemoveProducer = vi.fn();
vi.mock("@/common/store/callStore", () => ({
  default: {
    getState: vi.fn(() => ({
      isCallOwner: true,
      setProducerUser: vi.fn(),
      setProducerConsumer: vi.fn(),
      removeProducer: mockRemoveProducer,
    })),
  },
}));

vi.mock("@/common/store/uiStore", () => ({
  default: { getState: vi.fn(() => ({ interactionMode: "desk" })) },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/communication/utils/emitWithTimeout", () => ({
  emitWithTimeout: vi.fn(),
  validateNoError: vi.fn(),
  SFU_TIMEOUTS: {
    GET_PRODUCERS: 10000,
    CONSUME: 15000,
    RESUME_CONSUMER: 8000,
  },
}));

type VCViewerStatic = { instance: VideoChatViewer | null };
type VCViewerInternal = {
  consumers: Map<string, ReturnType<typeof makeConsumer>>;
  consumeProducer: (producerId: string) => Promise<void>;
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("VideoChatViewer", () => {
  let VideoChatViewer: (typeof import("./videoChatViewer"))["VideoChatViewer"];

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    ({ VideoChatViewer } = await import("./videoChatViewer"));
    (VideoChatViewer as unknown as VCViewerStatic).instance = null;
  });

  // ── producerRemoved event ─────────────────────────────────────────────

  describe("producerRemoved event", () => {
    it("calls removeScreenShareVideo for tracked producer", () => {
      const viewer = VideoChatViewer.getInstance();
      const consumer = makeConsumer("ca");
      (viewer as unknown as VCViewerInternal).consumers.set("prod-a", consumer);

      const producerRemovedCall = mockSocketOn.mock.calls.find(
        ([event]: [string]) => event === "producerRemoved",
      );
      expect(producerRemovedCall).toBeDefined();
      const handler = producerRemovedCall![1] as (payload: unknown) => void;

      handler({ producerId: "prod-a" });

      expect(consumer.close).toHaveBeenCalledTimes(1);
    });

    it("no-op for unknown producerId", () => {
      const viewer = VideoChatViewer.getInstance();
      const consumer = makeConsumer("ca");
      (viewer as unknown as VCViewerInternal).consumers.set("prod-a", consumer);

      const producerRemovedCall = mockSocketOn.mock.calls.find(
        ([event]: [string]) => event === "producerRemoved",
      );
      const handler = producerRemovedCall![1] as (payload: unknown) => void;

      // Should not throw or close the existing consumer
      handler({ producerId: "unknown-id" });

      expect(consumer.close).not.toHaveBeenCalled();
    });
  });

  // ── newProducer handler ───────────────────────────────────────────────

  describe("newProducer handler", () => {
    it("ignores non-camera source", () => {
      const viewer = VideoChatViewer.getInstance();
      const v = viewer as unknown as VCViewerInternal;
      const consumeSpy = vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

      const newProducerCall = mockSocketOn.mock.calls.find(
        ([event]: [string]) => event === "newProducer",
      );
      expect(newProducerCall).toBeDefined();
      const handler = newProducerCall![1] as (payload: unknown) => Promise<void>;

      handler({
        producerId: "prod-x",
        userName: "Alice",
        userId: 1,
        source: "screen", // not camera
      });

      expect(consumeSpy).not.toHaveBeenCalled();
    });

    it("skips when isCallOwner is false", async () => {
      const { default: useCallStore } = await import("@/common/store/callStore");
      (useCallStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        isCallOwner: false,
        setProducerUser: vi.fn(),
        setProducerConsumer: vi.fn(),
        removeProducer: vi.fn(),
      });

      const viewer = VideoChatViewer.getInstance();
      const v = viewer as unknown as VCViewerInternal;
      const consumeSpy = vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

      const newProducerCall = mockSocketOn.mock.calls.find(
        ([event]: [string]) => event === "newProducer",
      );
      const handler = newProducerCall![1] as (payload: unknown) => Promise<void>;

      await handler({
        producerId: "prod-cam",
        userName: "Bob",
        userId: 2,
        source: "camera",
      });

      expect(consumeSpy).not.toHaveBeenCalled();
    });
  });

  // ── cleanup ───────────────────────────────────────────────────────────

  describe("cleanup()", () => {
    it("removes producerRemoved listener and closes all consumers", () => {
      const viewer = VideoChatViewer.getInstance();
      const consumer = makeConsumer("ca");
      (viewer as unknown as VCViewerInternal).consumers.set("prod-a", consumer);

      viewer.cleanup();

      expect(mockSocket.off).toHaveBeenCalledWith("producerRemoved");
      expect(consumer.close).toHaveBeenCalledTimes(1);
    });
  });

  // ── singleton ─────────────────────────────────────────────────────────

  describe("getInstance()", () => {
    it("returns the same instance on repeated calls", () => {
      const a = VideoChatViewer.getInstance();
      const b = VideoChatViewer.getInstance();
      expect(a).toBe(b);
    });
  });
});
