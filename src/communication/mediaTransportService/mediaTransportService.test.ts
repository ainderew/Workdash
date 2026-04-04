import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mocks ──────────────────────────────────────────────────────────────

const socketHandlers: Record<string, (...args: unknown[]) => unknown> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
    socketHandlers[event] = handler;
  }),
  once: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  connected: false,
  id: "mock-socket-id",
};

vi.mock("socket.io-client", () => ({
  default: vi.fn(() => mockSocket),
}));

vi.mock("mediasoup-client", () => ({
  Device: vi.fn(() => ({
    loaded: false,
    load: vi.fn().mockResolvedValue(undefined),
    rtpCapabilities: {},
  })),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/common/store/useStore", () => ({
  default: {
    getState: vi.fn(() => ({
      user: { producerIds: [] },
      updateUser: vi.fn(),
    })),
  },
}));

vi.mock("@/common/utils/config", () => ({
  CONFIG: { SFU_SERVER_URL: "http://localhost:3000" },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockStatusClient = {
  setupListeners: vi.fn(),
  fetchDefinitions: vi.fn().mockReturnValue(Promise.resolve()),
};
vi.mock("@/communication/status/statusService", () => ({
  StatusClientService: {
    init: vi.fn(() => mockStatusClient),
  },
}));

const mockActivityClient = {
  init: vi.fn().mockReturnValue({ setupListeners: vi.fn() }),
};
vi.mock("@/communication/activity/activityService", () => ({
  ActivityClientService: {
    getInstance: vi.fn(() => mockActivityClient),
  },
}));

vi.mock("@/communication/utils/emitWithTimeout", () => ({
  emitWithTimeout: vi.fn(),
  SFU_TIMEOUTS: {
    CONNECT_TRANSPORT: 5000,
    PRODUCE: 5000,
    CONSUME: 15000,
    RESUME_CONSUMER: 8000,
    GET_PRODUCERS: 10000,
  },
  validateNoError: vi.fn(),
}));

const mockAudioChat = {
  getAudioProducer: vi.fn().mockReturnValue(null),
  stopMic: vi.fn(),
  closeAllAudioConsumers: vi.fn(),
  joinVoiceChat: vi.fn().mockResolvedValue(undefined),
  loadExistingProducers: vi.fn().mockResolvedValue(undefined),
};
vi.mock("@/communication/audioChat/audioChat", () => ({
  AudioChat: { getInstance: () => mockAudioChat },
}));

const mockCallSignalingService = {
  loadCallProducers: vi.fn(),
};
vi.mock("@/communication/callSignaling/callSignalingService", () => ({
  CallSignalingService: { getInstance: () => mockCallSignalingService },
}));

vi.mock("@/common/store/callStore", () => ({
  default: {
    getState: vi.fn(() => ({ currentCall: null })),
  },
}));

// ── Import after mocks ───────────────────────────────────────────────────────

import { MediaTransportService } from "./mediaTransportService";
import { SfuEvents } from "@/types/sfuEvents";

type MtsInternal = {
  isFirstSfuInit: boolean;
  resetting: boolean;
  initializeSfu: () => Promise<void>;
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("MediaTransportService", () => {
  let service: MediaTransportService;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
    (MediaTransportService as unknown as { instance: null }).instance = null;
    service = MediaTransportService.getInstance("test-token");
  });

  describe("sfuInitialized — first connect", () => {
    it("does not call reinitializeSfu on first sfuInitialized", async () => {
      const handler = socketHandlers[SfuEvents.SFU_INITIALIZED] as () => Promise<void>;
      expect(handler).toBeDefined();

      await handler();

      // On first connect, stopMic should NOT be called (reinitializeSfu not invoked)
      expect(mockAudioChat.stopMic).not.toHaveBeenCalled();
    });
  });

  describe("sfuInitialized — reconnect", () => {
    it("calls reinitializeSfu and re-consumes producers when in a call", async () => {
      const internal = service as unknown as MtsInternal;
      internal.isFirstSfuInit = false;

      // Stub initializeSfu to avoid real SFU setup
      vi.spyOn(internal, "initializeSfu").mockResolvedValue(undefined);

      // Simulate being in a call
      const { default: useCallStore } = await import("@/common/store/callStore");
      (useCallStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        currentCall: { channelId: "ch1" },
      });

      const handler = socketHandlers[SfuEvents.SFU_INITIALIZED] as () => Promise<void>;
      await handler();

      expect(mockAudioChat.stopMic).toHaveBeenCalled();
      expect(mockAudioChat.closeAllAudioConsumers).toHaveBeenCalled();
      expect(mockCallSignalingService.loadCallProducers).toHaveBeenCalled();
    });

    it("reinitializes but skips loadCallProducers when not in a call", async () => {
      const internal = service as unknown as MtsInternal;
      internal.isFirstSfuInit = false;

      vi.spyOn(internal, "initializeSfu").mockResolvedValue(undefined);

      const { default: useCallStore } = await import("@/common/store/callStore");
      (useCallStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        currentCall: null,
      });

      const handler = socketHandlers[SfuEvents.SFU_INITIALIZED] as () => Promise<void>;
      await handler();

      expect(mockAudioChat.stopMic).toHaveBeenCalled();
      expect(mockCallSignalingService.loadCallProducers).not.toHaveBeenCalled();
    });
  });

  describe("sfuReset", () => {
    it("calls reinitializeSfu and re-joins voice if had producer", async () => {
      const internal = service as unknown as MtsInternal;
      vi.spyOn(internal, "initializeSfu").mockResolvedValue(undefined);

      mockAudioChat.getAudioProducer.mockReturnValue({ closed: false });

      const handler = socketHandlers[SfuEvents.SFU_RESET] as () => Promise<void>;
      await handler();

      expect(mockAudioChat.stopMic).toHaveBeenCalled();
      expect(mockAudioChat.joinVoiceChat).toHaveBeenCalled();
    });

    it("reinitializes but does not re-join voice with no producer", async () => {
      const internal = service as unknown as MtsInternal;
      vi.spyOn(internal, "initializeSfu").mockResolvedValue(undefined);

      mockAudioChat.getAudioProducer.mockReturnValue(null);

      const handler = socketHandlers[SfuEvents.SFU_RESET] as () => Promise<void>;
      await handler();

      expect(mockAudioChat.stopMic).toHaveBeenCalled();
      expect(mockAudioChat.joinVoiceChat).not.toHaveBeenCalled();
    });
  });

  describe("re-entrancy guard", () => {
    it("second call during in-progress reinit is no-op", async () => {
      const internal = service as unknown as MtsInternal;
      vi.spyOn(internal, "initializeSfu").mockResolvedValue(undefined);

      mockAudioChat.getAudioProducer.mockReturnValue(null);

      // Trigger sfuReset
      const handler = socketHandlers[SfuEvents.SFU_RESET] as () => Promise<void>;
      const first = handler();

      // While first is in progress, trigger again
      const second = handler();

      await first;
      await second;

      // stopMic should only be called once (second was a no-op)
      expect(mockAudioChat.stopMic).toHaveBeenCalledTimes(1);
    });
  });

  describe("resetting flag lifecycle", () => {
    it("resetting is true during reinit and false after", async () => {
      const internal = service as unknown as MtsInternal;
      let capturedResetting: boolean | undefined;

      vi.spyOn(internal, "initializeSfu").mockImplementation(async () => {
        capturedResetting = service.resetting;
      });

      mockAudioChat.getAudioProducer.mockReturnValue(null);

      const handler = socketHandlers[SfuEvents.SFU_RESET] as () => Promise<void>;
      await handler();

      expect(capturedResetting).toBe(true);
      expect(service.resetting).toBe(false);
    });

    it("resetting is false even after initializeSfu throws", async () => {
      const internal = service as unknown as MtsInternal;
      vi.spyOn(internal, "initializeSfu").mockRejectedValue(new Error("boom"));

      mockAudioChat.getAudioProducer.mockReturnValue(null);

      const handler = socketHandlers[SfuEvents.SFU_RESET] as () => Promise<void>;
      await handler();

      expect(service.resetting).toBe(false);
    });
  });
});
