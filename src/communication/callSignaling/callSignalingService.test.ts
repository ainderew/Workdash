import { describe, it, expect, vi, beforeEach } from "vitest";
import useCallStore from "@/common/store/callStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { CallEvents } from "@/types/callEvents";
import type { CallParticipant, CallPresence } from "@/common/store/callStore";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const socketHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    socketHandlers[event] = handler;
  }),
  off: vi.fn(),
  once: vi.fn(),
  emit: vi.fn(),
  id: "mock-socket-id",
};

vi.mock("@/communication/mediaTransportService/mediaTransportService", () => ({
  MediaTransportService: {
    getInstance: () => ({ socket: mockSocket, resetting: false, recvTransport: { closed: false } }),
  },
}));

vi.mock("@/common/store/useStore", () => ({
  default: {
    getState: () => ({ backendUser: { id: 1 } }),
  },
}));

vi.mock("@/common/store/focusStore", () => ({
  default: {
    getState: () => ({ removeRemoteFocusMode: vi.fn() }),
  },
}));

vi.mock("@/communication/callSignaling/deviceId", () => ({
  getDeviceId: () => "mock-device-id",
}));

vi.mock("@/communication/callSignaling/callOwnershipChannel", () => ({
  initCallOwnershipChannel: vi.fn(),
  broadcastCallOwnership: vi.fn(),
  destroyCallOwnershipChannel: vi.fn(),
  getTabId: () => "mock-tab-id",
}));

const mockAudioChat = {
  stopMic: vi.fn(),
  closeAllAudioConsumers: vi.fn(),
  joinVoiceChat: vi.fn().mockResolvedValue(undefined),
  loadExistingProducers: vi.fn().mockResolvedValue(undefined),
};
vi.mock("@/communication/audioChat/audioChat", () => ({
  AudioChat: {
    getInstance: () => mockAudioChat,
  },
}));

vi.mock("@/communication/videoChat/videoChat", () => ({
  VideoChatService: {
    getInstance: () => ({ stopVideoChat: vi.fn() }),
  },
}));

const mockVideoChatViewer = {
  closeAllConsumers: vi.fn(),
  loadExistingProducers: vi.fn().mockResolvedValue(undefined),
};
vi.mock("@/communication/videoChat/videoChatViewer", () => ({
  VideoChatViewer: {
    getInstance: () => mockVideoChatViewer,
  },
}));

vi.mock("@/communication/screenShare/screenShare", () => ({
  ScreenShareService: {
    getInstance: () => ({ stopScreenShare: vi.fn() }),
  },
}));

const mockScreenShareViewer = {
  closeAllConsumers: vi.fn(),
  loadExistingProducers: vi.fn().mockResolvedValue(undefined),
};
vi.mock("@/communication/screenShare/screenShareViewer", () => ({
  ScreenShareViewer: {
    getInstance: () => mockScreenShareViewer,
  },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() },
}));

vi.mock("@/game/EventBus", () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock("@/communication/chatV2/chatV2Service", () => ({
  ChatV2Service: {
    getInstance: () => ({
      setupRealtimeHandlers: vi.fn().mockReturnValue(vi.fn()),
    }),
  },
}));

vi.mock("@/communication/chatV2/reactionFrequentCache", () => ({
  readFrequentEmojiLocal: vi.fn().mockReturnValue([]),
  writeFrequentEmojiLocal: vi.fn(),
  bumpFrequentEmojiLocal: vi.fn().mockReturnValue([]),
  mergeFrequentEmojiSources: vi.fn().mockReturnValue([]),
}));

vi.mock("@/common/utils/displayName", () => ({
  getDisplayName: vi.fn(
    (_user: unknown, fallback: string) => fallback ?? "Unknown",
  ),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let injectSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);

  // Reset callStore
  useCallStore.setState({
    activeCallsByChannel: {},
    currentCall: null,
    localMedia: { audio: false, video: false, screen: false },
    callOwnershipStatus: null,
    isCallOwner: false,
    ownershipChannelId: null,
  });

  // Reset chatV2Store
  useChatV2Store.setState({ messagesByRoomId: {} });

  // Spy on injectEphemeralMessage
  injectSpy = vi.fn(useChatV2Store.getState().injectEphemeralMessage);
  useChatV2Store.setState({ injectEphemeralMessage: injectSpy });

  // Reset singleton so setupListeners can re-run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (CallSignalingService as any).instance = null;
});

// Import after mocks are set up
import { CallSignalingService } from "./callSignalingService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAndGetHandler() {
  const service = CallSignalingService.getInstance();
  service.setupListeners();
  return socketHandlers[CallEvents.PARTICIPANT_LEFT];
}

function seedCallWithParticipant(
  channelId: string,
  participant: CallParticipant,
) {
  const call: CallPresence = {
    channelId,
    type: "audio",
    startedAt: new Date().toISOString(),
    participants: [participant],
  };
  useCallStore.setState({
    activeCallsByChannel: { [channelId]: call },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CallSignalingService — PARTICIPANT_LEFT ephemeral message", () => {
  it("captures display name before removal and injects ephemeral message", () => {
    seedCallWithParticipant("room-1", {
      userId: 42,
      displayName: "Alice",
      media: { audio: true, video: false, screen: false },
    });

    const handler = setupAndGetHandler();
    handler({ channelId: "room-1", userId: 42 });

    expect(injectSpy).toHaveBeenCalledTimes(1);
    const injectedMessage = injectSpy.mock.calls[0][0];
    expect(injectedMessage.metadata.displayName).toBe("Alice");
    expect(injectedMessage.metadata.eventType).toBe(
      "call_participant_left",
    );
    expect(injectedMessage.metadata.ephemeral).toBe(true);
    expect(injectedMessage.messageType).toBe("SYSTEM");
    expect(injectedMessage.roomId).toBe("room-1");
    expect(injectedMessage.content).toBe("Alice left the call");
  });

  it('falls back to "Someone" when participant is not found in call', () => {
    seedCallWithParticipant("room-1", {
      userId: 99,
      displayName: "Other",
      media: { audio: false, video: false, screen: false },
    });

    const handler = setupAndGetHandler();
    handler({ channelId: "room-1", userId: 42 });

    expect(injectSpy).toHaveBeenCalledTimes(1);
    const injectedMessage = injectSpy.mock.calls[0][0];
    expect(injectedMessage.metadata.displayName).toBe("Someone");
    expect(injectedMessage.content).toBe("Someone left the call");
  });

  it('falls back to "Someone" when call does not exist in store', () => {
    // No call seeded — activeCallsByChannel is empty
    const handler = setupAndGetHandler();
    handler({ channelId: "room-1", userId: 42 });

    expect(injectSpy).toHaveBeenCalledTimes(1);
    const injectedMessage = injectSpy.mock.calls[0][0];
    expect(injectedMessage.metadata.displayName).toBe("Someone");
  });

  it("constructs message with correct structure", () => {
    seedCallWithParticipant("room-1", {
      userId: 42,
      displayName: "Alice",
      media: { audio: true, video: false, screen: false },
    });

    const handler = setupAndGetHandler();
    handler({ channelId: "room-1", userId: 42 });

    const msg = injectSpy.mock.calls[0][0];
    expect(msg.id).toMatch(/^ephemeral-call-left-/);
    expect(msg.clientMessageId).toBe(msg.id);
    expect(msg.senderUserId).toBe(42);
    expect(msg.replyToMessageId).toBeNull();
    expect(msg.editedAt).toBeNull();
    expect(msg.deletedAt).toBeNull();
    expect(msg.attachments).toEqual([]);
    expect(msg.createdAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// loadCallProducers after join/start/ownership-change (Bugs 4, 5)
// ---------------------------------------------------------------------------

describe("CallSignalingService — loadCallProducers", () => {
  function initService() {
    const service = CallSignalingService.getInstance();
    service.setupListeners();
    return service;
  }

  it("startCall calls loadExistingProducers after joinVoiceChat", async () => {
    const service = initService();

    // Mock emit to call the ack callback immediately
    mockSocket.emit.mockImplementation(
      (event: string, _payload: unknown, ack?: (res: unknown) => void) => {
        if (event === "call:start" && ack) {
          ack({ ok: true, call: { channelId: "ch1", type: "audio", participants: [] } });
        }
      },
    );

    await service.startCall("ch1");

    expect(mockAudioChat.joinVoiceChat).toHaveBeenCalled();
    expect(mockAudioChat.loadExistingProducers).toHaveBeenCalled();
    expect(mockVideoChatViewer.loadExistingProducers).toHaveBeenCalled();
    expect(mockScreenShareViewer.loadExistingProducers).toHaveBeenCalled();
  });

  it("joinCall calls loadExistingProducers after joinVoiceChat", async () => {
    const service = initService();

    mockSocket.emit.mockImplementation(
      (event: string, _payload: unknown, ack?: (res: unknown) => void) => {
        if (event === "call:join" && ack) {
          ack({ ok: true, call: { channelId: "ch1", type: "audio", participants: [] } });
        }
      },
    );

    await service.joinCall("ch1");

    expect(mockAudioChat.joinVoiceChat).toHaveBeenCalled();
    expect(mockAudioChat.loadExistingProducers).toHaveBeenCalled();
    expect(mockVideoChatViewer.loadExistingProducers).toHaveBeenCalled();
    expect(mockScreenShareViewer.loadExistingProducers).toHaveBeenCalled();
  });

  it("OWNERSHIP_CHANGED handler calls loadExistingProducers when receiving ownership", async () => {
    initService();

    const handler = socketHandlers[CallEvents.OWNERSHIP_CHANGED];
    expect(handler).toBeDefined();

    // Simulate receiving ownership with a different channel (not already set up)
    await handler({
      channelId: "ch1",
      newOwnerSocketId: "mock-socket-id", // matches mockSocket.id
      userId: 1,
    });

    expect(mockAudioChat.joinVoiceChat).toHaveBeenCalled();
    expect(mockAudioChat.loadExistingProducers).toHaveBeenCalled();
    expect(mockVideoChatViewer.loadExistingProducers).toHaveBeenCalled();
    expect(mockScreenShareViewer.loadExistingProducers).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// registerSession — stale state clearing (Bug 7)
// ---------------------------------------------------------------------------

describe("CallSignalingService — registerSession stale state clearing", () => {
  function initServiceAndTriggerRegister() {
    const service = CallSignalingService.getInstance();
    service.setupListeners();

    // Find the SESSION_REGISTER emit call and extract its ack callback
    const registerCall = mockSocket.emit.mock.calls.find(
      (call: unknown[]) => call[0] === "session:register",
    );
    return registerCall;
  }

  it("clears stale call state when server reports no active call", () => {
    useCallStore.setState({ currentCall: { channelId: "ch1" } as CallPresence });

    const registerCall = initServiceAndTriggerRegister();
    expect(registerCall).toBeDefined();

    const ackCallback = registerCall![2] as (res: unknown) => void;
    ackCallback({ ok: true, activeCall: null });

    expect(useCallStore.getState().currentCall).toBeNull();
  });

  it("does not clear call state when client has no current call", () => {
    useCallStore.setState({ currentCall: null });

    const registerCall = initServiceAndTriggerRegister();
    expect(registerCall).toBeDefined();

    const ackCallback = registerCall![2] as (res: unknown) => void;
    ackCallback({ ok: true, activeCall: null });

    // teardownCallMedia should NOT have been called — no stopMic/closeAllConsumers
    expect(mockAudioChat.stopMic).not.toHaveBeenCalled();
  });

  it("sets ownership status when server reports active call with isOwner true", () => {
    const registerCall = initServiceAndTriggerRegister();
    expect(registerCall).toBeDefined();

    const ackCallback = registerCall![2] as (res: unknown) => void;
    ackCallback({ ok: true, activeCall: { channelId: "ch1", isOwner: true } });

    expect(useCallStore.getState().callOwnershipStatus).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// OWNERSHIP_CHANGED passive branch (Fix 3 review)
// ---------------------------------------------------------------------------

describe("CallSignalingService — OWNERSHIP_CHANGED passive branch", () => {
  it("calls teardownCallMedia when ownership goes to another socket", async () => {
    const service = CallSignalingService.getInstance();
    service.setupListeners();

    const handler = socketHandlers[CallEvents.OWNERSHIP_CHANGED];
    expect(handler).toBeDefined();

    // Simulate ownership going to a DIFFERENT socket
    await handler({
      channelId: "ch1",
      newOwnerSocketId: "other-socket-id", // does NOT match mockSocket.id
      userId: 2,
    });

    // teardownCallMedia stops mic, video, screen, and closes consumers
    expect(mockAudioChat.stopMic).toHaveBeenCalled();
    expect(mockVideoChatViewer.closeAllConsumers).toHaveBeenCalled();
    expect(useCallStore.getState().callOwnershipStatus).toBe("passive");
  });
});

// ---------------------------------------------------------------------------
// registerSession ack error path
// ---------------------------------------------------------------------------

describe("CallSignalingService — registerSession error handling", () => {
  it("does not mutate store when register ack returns error", () => {
    const service = CallSignalingService.getInstance();
    service.setupListeners();

    const registerCall = mockSocket.emit.mock.calls.find(
      (call: unknown[]) => call[0] === "session:register",
    );
    expect(registerCall).toBeDefined();

    const ackCallback = registerCall![2] as (res: unknown) => void;
    ackCallback({ error: "Too many active sessions" });

    // Store should not have been modified
    expect(useCallStore.getState().currentCall).toBeNull();
    expect(mockAudioChat.stopMic).not.toHaveBeenCalled();
  });
});
