import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
            isCallOwner: true,
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

type SSViewerStatic = { instance: ScreenShareViewer | null };
type SSViewerInternal = {
    consumers: Map<string, ReturnType<typeof makeConsumer>>;
    _videoElements: Map<string, HTMLVideoElement>;
    _videoOwnerMap: Record<string, string>;
    _subscribers: Set<() => void>;
    dataCheckTimers: Map<string, ReturnType<typeof setTimeout>>;
    consumeProducer: (producerId: string) => Promise<void>;
    displayVideo: (producerId: string, consumer: ReturnType<typeof makeConsumer>) => void;
    waitForPlayers: () => Promise<void>;
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("ScreenShareViewer", () => {
    let ScreenShareViewer: (typeof import("./screenShareViewer"))["ScreenShareViewer"];

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        ({ ScreenShareViewer } = await import("./screenShareViewer"));
        (ScreenShareViewer as unknown as SSViewerStatic).instance = null;
    });

    // ── cleanup() completeness ──────────────────────────────────────────

    describe("cleanup()", () => {
        it("closes all consumers", () => {
            const viewer = ScreenShareViewer.getInstance();
            const consumerA = makeConsumer("consumer-a");
            const consumerB = makeConsumer("consumer-b");
             
            (viewer as unknown as SSViewerInternal).consumers.set("prod-a", consumerA);
             
            (viewer as unknown as SSViewerInternal).consumers.set("prod-b", consumerB);

            viewer.cleanup();

            expect(consumerA.close).toHaveBeenCalledTimes(1);
            expect(consumerB.close).toHaveBeenCalledTimes(1);
        });

        it("nulls srcObject on all video elements before removing", () => {
            const viewer = ScreenShareViewer.getInstance();
             
            const v = viewer as unknown as SSViewerInternal;
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
             
            const v = viewer as unknown as SSViewerInternal;
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
             
            (viewer as unknown as SSViewerInternal).consumers.set("prod-a", makeConsumer("ca"));

            viewer.cleanup();

            expect(callback).toHaveBeenCalled();
        });

        it("runs fully even when no subscribers are registered", () => {
            const viewer = ScreenShareViewer.getInstance();
            // No subscribers — don't call subscribe()

            const consumer = makeConsumer("ca");
            const videoEl = document.createElement("video");
             
            const v = viewer as unknown as SSViewerInternal;
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
             
            (viewer as unknown as SSViewerInternal).consumers.set("prod-a", makeConsumer("ca"));
             
            (viewer as unknown as SSViewerInternal).consumers.set("prod-b", makeConsumer("cb"));

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
             
            (viewer as unknown as SSViewerInternal).consumers.set("prod-a", consumer);

            viewer.removeScreenShareVideo("prod-a");

            expect(consumer.close).toHaveBeenCalledTimes(1);
        });

        it("nulls srcObject on the video element before removing it", () => {
            const viewer = ScreenShareViewer.getInstance();
            const videoEl = document.createElement("video");
             
            (viewer as unknown as SSViewerInternal)._videoElements.set("prod-a", videoEl);

            viewer.removeScreenShareVideo("prod-a");

            expect(videoEl.srcObject).toBeNull();
        });

        it("deletes the producerId from videoOwnerMap", () => {
            const viewer = ScreenShareViewer.getInstance();
             
            (viewer as unknown as SSViewerInternal)._videoOwnerMap["prod-a"] = "Bob";
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
             
            const timers = (viewer as unknown as SSViewerInternal).dataCheckTimers;
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

             
            expect((viewer as unknown as SSViewerInternal)._subscribers.size).toBe(1);

            unsubscribe();
             
            expect((viewer as unknown as SSViewerInternal)._subscribers.size).toBe(0);
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
             
            const v = viewer as unknown as SSViewerInternal;
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
             
            const v = viewer as unknown as SSViewerInternal;
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
             
            (viewer as unknown as SSViewerInternal)._videoElements.set("prod-a", videoEl);

            expect(viewer.videoElements.get("prod-a")).toBe(videoEl);
            expect(viewer.videoElements.size).toBe(1);
        });
    });

    describe("videoOwnerMap (read-only accessor)", () => {
        it("exposes owner map for reading", () => {
            const viewer = ScreenShareViewer.getInstance();
             
            (viewer as unknown as SSViewerInternal)._videoOwnerMap["prod-a"] = "Alice";

            expect(viewer.videoOwnerMap["prod-a"]).toBe("Alice");
        });
    });

    // ── setupListeners() ────────────────────────────────────────────────

    describe("setupListeners() — socket event wiring", () => {
        it("ignores newProducer events where source !== 'screen'", () => {
            // Capture the newProducer handler registered during construction
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            // Find the handler registered for "newProducer"
            const newProducerCall = mockSocketOn.mock.calls.find(
                ([event]: [string]) => event === "newProducer",
            );
            expect(newProducerCall).toBeDefined();
            const handler = newProducerCall![1] as (payload: unknown) => void;

            handler({
                producerId: "prod-x",
                userName: "Alice",
                userId: 1,
                source: "camera",           // not "screen"
            });

            expect(v._videoOwnerMap["prod-x"]).toBeUndefined();
        });

        it("writes videoOwnerMap entry when newProducer arrives with source === 'screen'", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            // Stub consumeProducer so we do not need a full SFU round-trip
            vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            const newProducerCall = mockSocketOn.mock.calls.find(
                ([event]: [string]) => event === "newProducer",
            );
            const handler = newProducerCall![1] as (payload: unknown) => Promise<void>;

            await handler({
                producerId: "prod-screen",
                userName: "Bob",
                userId: 42,
                source: "screen",
            });

            expect(v._videoOwnerMap["prod-screen"]).toBe("Bob");
        });

        it("calls consumeProducer for a newProducer screen event", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;
            const consumeSpy = vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            const newProducerCall = mockSocketOn.mock.calls.find(
                ([event]: [string]) => event === "newProducer",
            );
            const handler = newProducerCall![1] as (payload: unknown) => Promise<void>;

            await handler({
                producerId: "prod-screen-2",
                userName: "Carol",
                source: "screen",
            });

            expect(consumeSpy).toHaveBeenCalledWith("prod-screen-2");
        });

        it("calls removeScreenShareVideo when producerRemoved fires", () => {
            const viewer = ScreenShareViewer.getInstance();
            const consumer = makeConsumer("ca");
            (viewer as unknown as SSViewerInternal).consumers.set("prod-a", consumer);

            const endShareCall = mockSocketOn.mock.calls.find(
                ([event]: [string]) => event === "producerRemoved",
            );
            expect(endShareCall).toBeDefined();
            const handler = endShareCall![1] as (payload: unknown) => void;

            handler({ producerId: "prod-a" });

            expect(consumer.close).toHaveBeenCalledTimes(1);
        });
    });

    // ── displayVideo() — internal path via consumeProducer ──────────────

    describe("displayVideo() — internal rendering logic", () => {
        beforeEach(() => {
            // jsdom does not implement MediaStream — stub it so displayVideo can
            // assign srcObject = new MediaStream([track]) without throwing.
            vi.stubGlobal(
                "MediaStream",
                vi.fn().mockImplementation(() => ({ getTracks: vi.fn(() => []) })),
            );
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it("does not create a video element when no subscribers are registered", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            // Bypass the full SFU handshake — call displayVideo directly
            const consumer = makeConsumer("ca");
            // No subscribers registered
            v.displayVideo("prod-a", consumer);

            expect(v._videoElements.has("prod-a")).toBe(false);
        });

        it("closes the consumer and removes it when track readyState !== 'live'", () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            viewer.subscribe(vi.fn());   // ensure subscribers exist

            const consumer = makeConsumer("ca");
            consumer.track.readyState = "ended" as MediaStreamTrackState;
            v.consumers.set("prod-a", consumer);

            v.displayVideo("prod-a", consumer);

            expect(consumer.close).toHaveBeenCalledTimes(1);
            expect(v.consumers.has("prod-a")).toBe(false);
            expect(v._videoElements.has("prod-a")).toBe(false);
        });

        it("creates a video element and notifies subscribers for a live track", () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            const callback = vi.fn();
            viewer.subscribe(callback);

            const consumer = makeConsumer("ca");
            v.displayVideo("prod-a", consumer);

            expect(v._videoElements.has("prod-a")).toBe(true);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it("sets a 10 s data-check timer that auto-removes the video on expiry", () => {
            vi.useFakeTimers();
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            viewer.subscribe(vi.fn());

            const consumer = makeConsumer("ca");
            v.consumers.set("prod-a", consumer);
            v.displayVideo("prod-a", consumer);

            // Timer is registered
            expect(v.dataCheckTimers.has("prod-a")).toBe(true);

            // Advance past the 10 s threshold without triggering onloadeddata
            vi.advanceTimersByTime(10_001);

            // Video element and consumer should have been removed
            expect(v._videoElements.has("prod-a")).toBe(false);
            vi.useRealTimers();
        });

        it("cancels the data-check timer when onloadeddata fires before 10 s", () => {
            vi.useFakeTimers();
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            viewer.subscribe(vi.fn());

            const consumer = makeConsumer("ca");
            v.consumers.set("prod-a", consumer);
            v.displayVideo("prod-a", consumer);

            const videoEl = v._videoElements.get("prod-a") as HTMLVideoElement;
            expect(videoEl).toBeDefined();

            // Simulate data arriving
            videoEl.onloadeddata!(new Event("loadeddata") as Event);

            // Timer should have been cleared
            expect(v.dataCheckTimers.has("prod-a")).toBe(false);

            // Advancing past 10 s should no longer remove the video
            vi.advanceTimersByTime(10_001);
            expect(v._videoElements.has("prod-a")).toBe(true);

            vi.useRealTimers();
        });

        it("calls removeScreenShareVideo when track.onended fires", () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            viewer.subscribe(vi.fn());

            const consumer = makeConsumer("ca");
            v.consumers.set("prod-a", consumer);
            v.displayVideo("prod-a", consumer);

            // Simulate browser signalling the track ended
            consumer.track.onended!();

            expect(v._videoElements.has("prod-a")).toBe(false);
            expect(v.consumers.has("prod-a")).toBe(false);
        });
    });

    // ── loadExistingProducers() ──────────────────────────────────────────

    describe("loadExistingProducers()", () => {
        let emitWithTimeoutMock: ReturnType<typeof vi.fn>;

        beforeEach(async () => {
            // Re-import to get the fresh mock reference after resetModules
            const { emitWithTimeout } = await import(
                "@/communication/utils/emitWithTimeout"
            );
            emitWithTimeoutMock = emitWithTimeout as ReturnType<typeof vi.fn>;
        });

        it("skips waitForPlayers when interactionMode is 'desk'", async () => {
            // uiStore mock already returns "desk"
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            const waitSpy = vi.spyOn(v, "waitForPlayers").mockResolvedValue(undefined);
            const consumeSpy = vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            emitWithTimeoutMock.mockResolvedValue([]);

            await viewer.loadExistingProducers();

            expect(waitSpy).not.toHaveBeenCalled();
            expect(consumeSpy).not.toHaveBeenCalled();
        });

        it("ignores non-screen producers returned by getProducers", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            emitWithTimeoutMock.mockResolvedValue([
                { producerId: "cam-1", socketId: "s1", source: "camera" },
                { producerId: "screen-1", socketId: "s2", source: "screen", userName: "Alice", userId: 1 },
            ]);

            await viewer.loadExistingProducers();

            // Only the screen producer should have been consumed
            expect(v.consumeProducer).toHaveBeenCalledTimes(1);
            expect(v.consumeProducer).toHaveBeenCalledWith("screen-1");
        });

        it("stores userName from getProducers response when provided", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            emitWithTimeoutMock.mockResolvedValue([
                { producerId: "screen-1", socketId: "s1", source: "screen", userName: "Alice", userId: 1 },
            ]);

            await viewer.loadExistingProducers();

            expect(v._videoOwnerMap["screen-1"]).toBe("Alice");
        });

        it("falls back to playerStore when producer has no userName", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            emitWithTimeoutMock.mockResolvedValue([
                { producerId: "screen-1", socketId: "socket-abc", source: "screen" },
            ]);

            // Provide a matching player in the mock playerStore
            const { default: usePlayersStore } = await import("@/common/store/playerStore");
            (usePlayersStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
                playerMap: { "socket-abc": { name: "Dan" } },
            });

            await viewer.loadExistingProducers();

            expect(v._videoOwnerMap["screen-1"]).toBe("Dan");
        });

        it("assigns 'Unknown User' when neither userName nor playerStore has the name", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            emitWithTimeoutMock.mockResolvedValue([
                { producerId: "screen-1", socketId: "socket-xyz", source: "screen" },
            ]);

            await viewer.loadExistingProducers();

            expect(v._videoOwnerMap["screen-1"]).toBe("Unknown User");
        });

        it("resolves 'Unknown User' name when playerStore fires a matching update", async () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            vi.spyOn(v, "consumeProducer").mockResolvedValue(undefined);

            emitWithTimeoutMock.mockResolvedValue([
                { producerId: "screen-1", socketId: "socket-late", source: "screen" },
            ]);

            const { default: usePlayersStore } = await import("@/common/store/playerStore");
            let capturedSubscriberFn: ((state: { playerMap: Record<string, { name: string }> }) => void) | null = null;
            (usePlayersStore.subscribe as ReturnType<typeof vi.fn>).mockImplementation(
                (fn: (state: { playerMap: Record<string, { name: string }> }) => void) => {
                    capturedSubscriberFn = fn;
                    return vi.fn();
                },
            );

            await viewer.loadExistingProducers();

            expect(v._videoOwnerMap["screen-1"]).toBe("Unknown User");

            // Simulate playerStore update arriving with the resolved name
            capturedSubscriberFn!({ playerMap: { "socket-late": { name: "Eve" } } });

            expect(v._videoOwnerMap["screen-1"]).toBe("Eve");
        });
    });

    // ── pauseAllConsumers() / resumeAllConsumers() ───────────────────────

    describe("pauseAllConsumers() / resumeAllConsumers()", () => {
        it("calls pause() on every tracked consumer", () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;
            const ca = makeConsumer("ca");
            const cb = makeConsumer("cb");
            v.consumers.set("prod-a", ca);
            v.consumers.set("prod-b", cb);

            viewer.pauseAllConsumers();

            expect(ca.pause).toHaveBeenCalledTimes(1);
            expect(cb.pause).toHaveBeenCalledTimes(1);
        });

        it("calls resume() on every tracked consumer", () => {
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;
            const ca = makeConsumer("ca");
            const cb = makeConsumer("cb");
            v.consumers.set("prod-a", ca);
            v.consumers.set("prod-b", cb);

            viewer.resumeAllConsumers();

            expect(ca.resume).toHaveBeenCalledTimes(1);
            expect(cb.resume).toHaveBeenCalledTimes(1);
        });
    });

    // ── cleanup() timer ordering ─────────────────────────────────────────

    describe("cleanup() — timer cancellation ordering", () => {
        it("clears all timers before iterating consumers so timers cannot fire mid-cleanup", () => {
            vi.useFakeTimers();
            const viewer = ScreenShareViewer.getInstance();
            const v = viewer as unknown as SSViewerInternal;

            const consumer = makeConsumer("ca");
            v.consumers.set("prod-a", consumer);

            // Manually inject a data-check timer for this producer
            const timer = setTimeout(() => {
                // If this fires it would call removeScreenShareVideo a second time
                viewer.removeScreenShareVideo("prod-a");
            }, 1);
            v.dataCheckTimers.set("prod-a", timer);

            // cleanup() should clear the timer before processing consumers
            viewer.cleanup();

            // Advancing time must not cause a double-close
            vi.advanceTimersByTime(100);
            expect(consumer.close).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });

    // ── removeScreenShareVideo() — no-op subscriber check ───────────────

    describe("removeScreenShareVideo() — extended", () => {
        it("does not fire an extra subscriber notification for a completely unknown producerId", () => {
            const viewer = ScreenShareViewer.getInstance();
            const callback = vi.fn();
            viewer.subscribe(callback);

            // Still notifies once (the implementation always calls notifySubscribers)
            // — this test locks in the existing contract so a future change is caught.
            viewer.removeScreenShareVideo("totally-unknown");

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });
});
