import { describe, it, expect, vi, beforeEach } from "vitest";
import useReadyCheckStore from "@/common/store/readyCheckStore";
import { ReadyCheckEvents } from "@/types/readyCheckEvents";
import type { ReadyCheckSnapshot } from "@/communication/readyCheck/_types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const socketHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockSocket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        socketHandlers[event] = handler;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    id: "mock-socket-id",
};

vi.mock("@/communication/mediaTransportService/mediaTransportService", () => ({
    MediaTransportService: {
        getInstance: () => ({ socket: mockSocket }),
    },
}));

const userStoreState = {
    backendUser: { id: 1 },
};
vi.mock("@/common/store/useStore", () => ({
    default: { getState: () => userStoreState },
}));

const focusStoreState = { localFocusMode: false };
vi.mock("@/common/store/focusStore", () => ({
    default: { getState: () => focusStoreState },
}));

const chatStoreState: { currentRoomId: string | null } = {
    currentRoomId: null,
};
vi.mock("@/common/store/chatV2Store", () => ({
    default: { getState: () => chatStoreState },
}));

vi.mock("@/common/utils/logger", () => ({
    logger: { warn: vi.fn(), log: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock the synthesised chime module — its internals (Web Audio API,
// reduced-motion gating) are covered by readyCheckSound.test.ts.
const { playSummonChimeSpy } = vi.hoisted(() => ({
    playSummonChimeSpy: vi.fn(),
}));
vi.mock("./readyCheckSound", () => ({
    playSummonChime: playSummonChimeSpy,
    playLockedInChime: vi.fn(),
}));

// Import after all mocks
import { ReadyCheckClientService } from "./readyCheckService";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function makeSnapshot(
    overrides: Partial<ReadyCheckSnapshot> = {},
): ReadyCheckSnapshot {
    return {
        checkId: "c-1",
        channelId: "ch-1",
        invokerUserId: 1,
        invokerDisplayName: "Alice",
        startedAt: "2026-06-03T00:00:00Z",
        expiresAt: "2026-06-03T00:00:30Z",
        timeoutMs: 30_000,
        targets: [],
        resolved: false,
        resolvedReason: null,
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
    focusStoreState.localFocusMode = false;
    chatStoreState.currentRoomId = null;
    useReadyCheckStore.getState().reset();
    // Reset singleton so setupListeners can re-run with a fresh handler map
    (
        ReadyCheckClientService as unknown as {
            instance: ReadyCheckClientService | null;
        }
    ).instance = null;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReadyCheckClientService — listener wiring", () => {
    it("subscribes to ACTIVE, RESOLVED, PROMPT, and connect on setupListeners", () => {
        ReadyCheckClientService.getInstance().setupListeners();
        expect(socketHandlers[ReadyCheckEvents.ACTIVE]).toBeDefined();
        expect(socketHandlers[ReadyCheckEvents.RESOLVED]).toBeDefined();
        expect(socketHandlers[ReadyCheckEvents.PROMPT]).toBeDefined();
        expect(socketHandlers["connect"]).toBeDefined();
    });

    it("ACTIVE handler applies the snapshot to the store", () => {
        ReadyCheckClientService.getInstance().setupListeners();
        const snap = makeSnapshot();
        socketHandlers[ReadyCheckEvents.ACTIVE]!(snap);

        expect(
            useReadyCheckStore.getState().currentCheckByChannelId["ch-1"],
        ).toEqual(snap);
    });

    it("RESOLVED handler applies a resolved snapshot to the store", () => {
        ReadyCheckClientService.getInstance().setupListeners();
        const snap = makeSnapshot({
            resolved: true,
            resolvedReason: "all-responded",
        });
        socketHandlers[ReadyCheckEvents.RESOLVED]!(snap);

        const stored =
            useReadyCheckStore.getState().currentCheckByChannelId["ch-1"];
        expect(stored?.resolved).toBe(true);
    });

    it("PROMPT handler sets activePromptCheckId and plays sound (not focused)", () => {
        ReadyCheckClientService.getInstance().setupListeners();
        socketHandlers[ReadyCheckEvents.PROMPT]!({
            checkId: "c-1",
            channelId: "ch-1",
            invokerDisplayName: "Alice",
            expiresAt: "2026-06-03T00:00:30Z",
        });

        expect(useReadyCheckStore.getState().activePromptCheckId).toBe("c-1");
        expect(playSummonChimeSpy).toHaveBeenCalledTimes(1);
    });

    it("PROMPT handler is a no-op when localFocusMode is true", () => {
        focusStoreState.localFocusMode = true;
        ReadyCheckClientService.getInstance().setupListeners();
        socketHandlers[ReadyCheckEvents.PROMPT]!({
            checkId: "c-1",
            channelId: "ch-1",
            invokerDisplayName: "Alice",
            expiresAt: "2026-06-03T00:00:30Z",
        });

        expect(useReadyCheckStore.getState().activePromptCheckId).toBeNull();
        expect(playSummonChimeSpy).not.toHaveBeenCalled();
    });
});

describe("ReadyCheckClientService — RPCs", () => {
    it("respond emits with payload and records optimistic local response", async () => {
        ReadyCheckClientService.getInstance().setupListeners();

        mockSocket.emit.mockImplementation(
            (
                event: string,
                _payload: unknown,
                ack?: (res: unknown) => void,
            ) => {
                if (event === ReadyCheckEvents.RESPOND && ack) {
                    ack({ ok: true });
                }
            },
        );

        const res = await ReadyCheckClientService.getInstance().respond(
            "c-1",
            true,
        );
        expect(res).toEqual({ ok: true });

        const emitCall = mockSocket.emit.mock.calls.find(
            (c) => c[0] === ReadyCheckEvents.RESPOND,
        );
        expect(emitCall?.[1]).toEqual({ checkId: "c-1", ready: true });
        expect(
            useReadyCheckStore.getState().localResponseByCheckId["c-1"],
        ).toBe("ready");
    });

    it("cancel emits with correct payload", async () => {
        ReadyCheckClientService.getInstance().setupListeners();

        mockSocket.emit.mockImplementation(
            (
                event: string,
                _payload: unknown,
                ack?: (res: unknown) => void,
            ) => {
                if (event === ReadyCheckEvents.CANCEL && ack) {
                    ack({ ok: true });
                }
            },
        );

        await ReadyCheckClientService.getInstance().cancel("c-1");
        const emitCall = mockSocket.emit.mock.calls.find(
            (c) => c[0] === ReadyCheckEvents.CANCEL,
        );
        expect(emitCall?.[1]).toEqual({ checkId: "c-1" });
    });

    it("fetchActive applies snapshot and opens modal when local user is pending", async () => {
        ReadyCheckClientService.getInstance().setupListeners();

        const snap = makeSnapshot({
            targets: [
                {
                    userId: 1, // localUserId
                    displayName: "Alice",
                    state: "pending",
                    respondedAt: null,
                },
            ],
        });
        mockSocket.emit.mockImplementation(
            (
                event: string,
                _payload: unknown,
                ack?: (res: unknown) => void,
            ) => {
                if (event === ReadyCheckEvents.GET_ACTIVE && ack) {
                    ack({ ok: true, snapshot: snap });
                }
            },
        );

        await ReadyCheckClientService.getInstance().fetchActive("ch-1");

        expect(
            useReadyCheckStore.getState().currentCheckByChannelId["ch-1"],
        ).toEqual(snap);
        expect(useReadyCheckStore.getState().activePromptCheckId).toBe("c-1");
        expect(playSummonChimeSpy).toHaveBeenCalledTimes(1);
    });

    it("fetchActive does NOT open modal when local user is already ready", async () => {
        ReadyCheckClientService.getInstance().setupListeners();

        const snap = makeSnapshot({
            targets: [
                {
                    userId: 1,
                    displayName: "Alice",
                    state: "ready",
                    respondedAt: "2026-06-03T00:00:05Z",
                },
            ],
        });
        mockSocket.emit.mockImplementation(
            (
                event: string,
                _payload: unknown,
                ack?: (res: unknown) => void,
            ) => {
                if (event === ReadyCheckEvents.GET_ACTIVE && ack) {
                    ack({ ok: true, snapshot: snap });
                }
            },
        );

        await ReadyCheckClientService.getInstance().fetchActive("ch-1");
        expect(useReadyCheckStore.getState().activePromptCheckId).toBeNull();
    });

    it("fetchActive does NOT open modal when localFocusMode is true", async () => {
        focusStoreState.localFocusMode = true;
        ReadyCheckClientService.getInstance().setupListeners();

        const snap = makeSnapshot({
            targets: [
                {
                    userId: 1,
                    displayName: "Alice",
                    state: "pending",
                    respondedAt: null,
                },
            ],
        });
        mockSocket.emit.mockImplementation(
            (
                event: string,
                _payload: unknown,
                ack?: (res: unknown) => void,
            ) => {
                if (event === ReadyCheckEvents.GET_ACTIVE && ack) {
                    ack({ ok: true, snapshot: snap });
                }
            },
        );

        await ReadyCheckClientService.getInstance().fetchActive("ch-1");
        expect(useReadyCheckStore.getState().activePromptCheckId).toBeNull();
    });

    it("fetchActive is a no-op on null snapshot", async () => {
        ReadyCheckClientService.getInstance().setupListeners();

        mockSocket.emit.mockImplementation(
            (
                event: string,
                _payload: unknown,
                ack?: (res: unknown) => void,
            ) => {
                if (event === ReadyCheckEvents.GET_ACTIVE && ack) {
                    ack({ ok: true, snapshot: null });
                }
            },
        );

        await ReadyCheckClientService.getInstance().fetchActive("ch-1");
        expect(
            useReadyCheckStore.getState().currentCheckByChannelId,
        ).toEqual({});
        expect(useReadyCheckStore.getState().activePromptCheckId).toBeNull();
    });
});

describe("ReadyCheckClientService — reconnect", () => {
    it("re-fetches active check for current channel on connect event", () => {
        chatStoreState.currentRoomId = "ch-active";
        ReadyCheckClientService.getInstance().setupListeners();

        mockSocket.emit.mockClear();
        socketHandlers["connect"]!();

        const fetchEmit = mockSocket.emit.mock.calls.find(
            (c) => c[0] === ReadyCheckEvents.GET_ACTIVE,
        );
        expect(fetchEmit).toBeDefined();
        expect(fetchEmit?.[1]).toEqual({ channelId: "ch-active" });
    });

    it("does NOT re-fetch on connect when no channel is selected", () => {
        chatStoreState.currentRoomId = null;
        ReadyCheckClientService.getInstance().setupListeners();

        mockSocket.emit.mockClear();
        socketHandlers["connect"]!();

        const fetchEmit = mockSocket.emit.mock.calls.find(
            (c) => c[0] === ReadyCheckEvents.GET_ACTIVE,
        );
        expect(fetchEmit).toBeUndefined();
    });
});

describe("ReadyCheckClientService — teardown", () => {
    it("unsubscribes from all listeners", () => {
        const svc = ReadyCheckClientService.getInstance();
        svc.setupListeners();
        svc.teardown();

        expect(mockSocket.off).toHaveBeenCalledWith(ReadyCheckEvents.ACTIVE);
        expect(mockSocket.off).toHaveBeenCalledWith(
            ReadyCheckEvents.RESOLVED,
        );
        expect(mockSocket.off).toHaveBeenCalledWith(ReadyCheckEvents.PROMPT);
    });
});
