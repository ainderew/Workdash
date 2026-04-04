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
    getInstance: () => ({ socket: mockSocket }),
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

vi.mock("@/communication/audioChat/audioChat", () => ({
  AudioChat: {
    getInstance: () => ({
      stopMic: vi.fn(),
      closeAllAudioConsumers: vi.fn(),
      joinVoiceChat: vi.fn(),
    }),
  },
}));

vi.mock("@/communication/videoChat/videoChat", () => ({
  VideoChatService: {
    getInstance: () => ({ stopVideoChat: vi.fn() }),
  },
}));

vi.mock("@/communication/videoChat/videoChatViewer", () => ({
  VideoChatViewer: {
    getInstance: () => ({ closeAllConsumers: vi.fn() }),
  },
}));

vi.mock("@/communication/screenShare/screenShare", () => ({
  ScreenShareService: {
    getInstance: () => ({ stopScreenShare: vi.fn() }),
  },
}));

vi.mock("@/communication/screenShare/screenShareViewer", () => ({
  ScreenShareViewer: {
    getInstance: () => ({ closeAllConsumers: vi.fn() }),
  },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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
