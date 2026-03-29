import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mocks ──────────────────────────────────────────────────────────────

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
        subscribe: vi.fn(() => vi.fn()),
    },
}));

const mockRemoveScreenProducer = vi.fn();
vi.mock("@/common/store/callStore", () => ({
    default: {
        getState: vi.fn(() => ({
            setScreenProducerUser: vi.fn(),
            setProducerConsumer: vi.fn(),
            removeScreenProducer: mockRemoveScreenProducer,
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

// ── Test suite ────────────────────────────────────────────────────────────────

describe("ScreenShareViewer", () => {
    let ScreenShareViewer: (typeof import("./screenShareViewer"))["ScreenShareViewer"];

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        ({ ScreenShareViewer } = await import("./screenShareViewer"));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ScreenShareViewer as any).instance = null;
    });

    // ── cleanup() completeness ──────────────────────────────────────────

    describe("cleanup()", () => {
        it("closes all consumers", () => {
            const viewer = ScreenShareViewer.getInstance();
            const consumerA = makeConsumer("consumer-a");
            const consumerB = makeConsumer("consumer-b");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any).consumers.set("prod-a", consumerA);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any).consumers.set("prod-b", consumerB);

            viewer.cleanup();

            expect(consumerA.close).toHaveBeenCalledTimes(1);
            expect(consumerB.close).toHaveBeenCalledTimes(1);
        });

        it("nulls srcObject on all video elements before removing", () => {
            const viewer = ScreenShareViewer.getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = viewer as any;
            const videoA = document.createElement("video");
            const videoB = document.createElement("video");
            v._videoElements.set("prod-a", videoA);
            v._videoElements.set("prod-b", videoB);
            // cleanup iterates consumers, so add matching consumers
            v.consumers.set("prod-a", makeConsumer("ca"));
            v.consumers.set("prod-b", makeConsumer("cb"));

            viewer.cleanup();

            expect(videoA.srcObject).toBeNull();
            expect(videoB.srcObject).toBeNull();
        });

        it("clears all internal maps", () => {
            const viewer = ScreenShareViewer.getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = viewer as any;
            v.consumers.set("prod-a", makeConsumer("ca"));
            v._videoElements.set("prod-a", document.createElement("video"));
            v._videoOwnerMap["prod-a"] = "Alice";

            viewer.cleanup();

            expect(v.consumers.size).toBe(0);
            expect(v._videoElements.size).toBe(0);
            expect(Object.keys(v._videoOwnerMap)).toHaveLength(0);
        });

        it("notifies subscribers after cleanup", () => {
            const viewer = ScreenShareViewer.getInstance();
            const callback = vi.fn();
            viewer.subscribe(callback);

            // Add some state so removeScreenShareVideo has something to clean
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any).consumers.set("prod-a", makeConsumer("ca"));

            viewer.cleanup();

            expect(callback).toHaveBeenCalled();
        });

        it("runs fully even when no subscribers are registered", () => {
            const viewer = ScreenShareViewer.getInstance();
            // No subscribers — don't call subscribe()

            const consumer = makeConsumer("ca");
            const videoEl = document.createElement("video");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = viewer as any;
            v.consumers.set("prod-a", consumer);
            v._videoElements.set("prod-a", videoEl);
            v._videoOwnerMap["prod-a"] = "Alice";

            expect(() => viewer.cleanup()).not.toThrow();
            expect(consumer.close).toHaveBeenCalled();
            expect(v.consumers.size).toBe(0);
            expect(v._videoElements.size).toBe(0);
            expect(Object.keys(v._videoOwnerMap)).toHaveLength(0);
        });

        it("syncs callStore and useUserStore for each producer on cleanup", () => {
            const viewer = ScreenShareViewer.getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any).consumers.set("prod-a", makeConsumer("ca"));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any).consumers.set("prod-b", makeConsumer("cb"));

            viewer.cleanup();

            // removeScreenShareVideo calls removeScreenProducer and updateUser for each
            expect(mockRemoveScreenProducer).toHaveBeenCalledWith("prod-a");
            expect(mockRemoveScreenProducer).toHaveBeenCalledWith("prod-b");
            expect(mockUpdateUser).toHaveBeenCalledTimes(2);
        });
    });

    // ── removeScreenShareVideo() ────────────────────────────────────────

    describe("removeScreenShareVideo()", () => {
        it("closes the consumer for the given producerId", () => {
            const viewer = ScreenShareViewer.getInstance();
            const consumer = makeConsumer("ca");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any).consumers.set("prod-a", consumer);

            viewer.removeScreenShareVideo("prod-a");

            expect(consumer.close).toHaveBeenCalledTimes(1);
        });

        it("nulls srcObject on the video element before removing it", () => {
            const viewer = ScreenShareViewer.getInstance();
            const videoEl = document.createElement("video");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any)._videoElements.set("prod-a", videoEl);

            viewer.removeScreenShareVideo("prod-a");

            expect(videoEl.srcObject).toBeNull();
        });

        it("deletes the producerId from videoOwnerMap", () => {
            const viewer = ScreenShareViewer.getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any)._videoOwnerMap["prod-a"] = "Bob";
            viewer.removeScreenShareVideo("prod-a");
            expect(viewer.videoOwnerMap["prod-a"]).toBeUndefined();
        });

        it("notifies subscribers to trigger a re-render", () => {
            const viewer = ScreenShareViewer.getInstance();
            const callback = vi.fn();
            viewer.subscribe(callback);
            viewer.removeScreenShareVideo("prod-a");
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it("is a no-op (no throw) for an unknown producerId", () => {
            const viewer = ScreenShareViewer.getInstance();
            expect(() =>
                viewer.removeScreenShareVideo("nonexistent"),
            ).not.toThrow();
        });

        it("clears pending data-check timer for the producerId", () => {
            vi.useFakeTimers();
            const viewer = ScreenShareViewer.getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const timers = (viewer as any).dataCheckTimers as Map<
                string,
                ReturnType<typeof setTimeout>
            >;
            const timer = setTimeout(() => {}, 10000);
            timers.set("prod-a", timer);

            viewer.removeScreenShareVideo("prod-a");

            expect(timers.has("prod-a")).toBe(false);
            vi.useRealTimers();
        });
    });

    // ── subscribe() ─────────────────────────────────────────────────────

    describe("subscribe()", () => {
        it("returns an unsubscribe function that removes the callback", () => {
            const viewer = ScreenShareViewer.getInstance();
            const callback = vi.fn();
            const unsubscribe = viewer.subscribe(callback);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((viewer as any)._subscribers.size).toBe(1);

            unsubscribe();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((viewer as any)._subscribers.size).toBe(0);
        });

        it("supports multiple concurrent subscribers", () => {
            const viewer = ScreenShareViewer.getInstance();
            const cb1 = vi.fn();
            const cb2 = vi.fn();
            viewer.subscribe(cb1);
            viewer.subscribe(cb2);

            // Trigger notification via removeScreenShareVideo (easiest path)
            viewer.removeScreenShareVideo("none");

            expect(cb1).toHaveBeenCalled();
            expect(cb2).toHaveBeenCalled();
        });
    });

    // ── Singleton ───────────────────────────────────────────────────────

    describe("getInstance()", () => {
        it("returns the same instance on repeated calls", () => {
            const a = ScreenShareViewer.getInstance();
            const b = ScreenShareViewer.getInstance();
            expect(a).toBe(b);
        });
    });

    // ── closeAllConsumers() ─────────────────────────────────────────────

    describe("closeAllConsumers()", () => {
        it("removes all tracked consumers and clears maps", () => {
            const viewer = ScreenShareViewer.getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = viewer as any;
            v.consumers.set("prod-a", makeConsumer("ca"));
            v.consumers.set("prod-b", makeConsumer("cb"));
            v._videoOwnerMap["prod-a"] = "Alice";
            v._videoOwnerMap["prod-b"] = "Bob";

            viewer.closeAllConsumers();

            expect(v.consumers.size).toBe(0);
        });

        it("notifies subscribers once per removal", () => {
            const viewer = ScreenShareViewer.getInstance();
            const callback = vi.fn();
            viewer.subscribe(callback);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = viewer as any;
            v.consumers.set("prod-a", makeConsumer("ca"));
            v.consumers.set("prod-b", makeConsumer("cb"));

            viewer.closeAllConsumers();

            expect(callback).toHaveBeenCalledTimes(2);
        });
    });

    // ── Read-only accessors ─────────────────────────────────────────────

    describe("videoElements (read-only accessor)", () => {
        it("exposes video elements for reading", () => {
            const viewer = ScreenShareViewer.getInstance();
            const videoEl = document.createElement("video");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any)._videoElements.set("prod-a", videoEl);

            expect(viewer.videoElements.get("prod-a")).toBe(videoEl);
            expect(viewer.videoElements.size).toBe(1);
        });
    });

    describe("videoOwnerMap (read-only accessor)", () => {
        it("exposes owner map for reading", () => {
            const viewer = ScreenShareViewer.getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewer as any)._videoOwnerMap["prod-a"] = "Alice";

            expect(viewer.videoOwnerMap["prod-a"]).toBe("Alice");
        });
    });
});
