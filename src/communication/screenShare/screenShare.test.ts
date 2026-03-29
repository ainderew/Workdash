import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock state ─────────────────────────────────────────────────────────

const mockStop = vi.fn();

function makeStream(withAudio = false) {
    const videoTrack = { stop: mockStop, onended: null as (() => void) | null };
    const audioTrack = { stop: vi.fn() };
    const tracks = withAudio ? [videoTrack, audioTrack] : [videoTrack];
    return {
        getVideoTracks: vi.fn(() => [videoTrack]),
        getAudioTracks: vi.fn(() => (withAudio ? [audioTrack] : [])),
        getTracks: vi.fn(() => [...tracks]),
    };
}

function makeProducer(id: string) {
    return {
        id,
        closed: false,
        close: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
    };
}

const mockSocketEmit = vi.fn();
const mockSendTransportProduce = vi.fn();

vi.mock("@/communication/mediaTransportService/mediaTransportService", () => ({
    MediaTransportService: {
        getInstance: vi.fn(() => ({
            socket: { emit: mockSocketEmit, on: vi.fn(), off: vi.fn() },
            sendTransport: {
                id: "send-transport-id",
                closed: false,
                produce: mockSendTransportProduce,
            },
        })),
    },
}));

vi.mock("@/communication/callSignaling/callSignalingService", () => ({
    CallSignalingService: {
        getInstance: vi.fn(() => ({ setMedia: vi.fn() })),
    },
}));

vi.mock("@/common/store/callStore", () => ({
    default: {
        getState: vi.fn(() => ({ currentCall: null })),
    },
}));

vi.mock("@/communication/utils/emitWithTimeout", () => ({
    assertTransportReady: vi.fn(),
}));

// ── Test suite ────────────────────────────────────────────────────────────────

describe("ScreenShareService", () => {
    let ScreenShareService: (typeof import("./screenShare"))["ScreenShareService"];

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        ({ ScreenShareService } = await import("./screenShare"));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ScreenShareService as any).instance = null;
    });

    // ── startScreenShare() error rollback ───────────────────────────────

    describe("startScreenShare() — error rollback when produce() fails", () => {
        it("stops all tracks when video produce() rejects after getDisplayMedia() succeeds", async () => {
            const stream = makeStream();
            vi.stubGlobal("navigator", {
                mediaDevices: {
                    getDisplayMedia: vi.fn().mockResolvedValue(stream),
                },
            });
            mockSendTransportProduce.mockRejectedValue(
                new Error("produce failed"),
            );

            const service = ScreenShareService.getInstance();
            await expect(service.startScreenShare()).rejects.toThrow(
                "produce failed",
            );

            expect(
                stream.getTracks().every((t: { stop: unknown }) =>
                    typeof t.stop === "function",
                ),
            ).toBe(true);
            // Each track's stop() should have been called
            for (const track of stream.getTracks()) {
                expect(track.stop).toHaveBeenCalled();
            }
        });

        it("nulls currentStream when video produce() rejects", async () => {
            const stream = makeStream();
            vi.stubGlobal("navigator", {
                mediaDevices: {
                    getDisplayMedia: vi.fn().mockResolvedValue(stream),
                },
            });
            mockSendTransportProduce.mockRejectedValue(
                new Error("produce failed"),
            );

            const service = ScreenShareService.getInstance();
            await expect(service.startScreenShare()).rejects.toThrow();

            expect(service.getCurrentStream()).toBeNull();
        });

        it("closes video producer and emits producerClosed when audio produce() rejects", async () => {
            const videoProducer = makeProducer("video-producer-1");
            const stream = makeStream(true);
            vi.stubGlobal("navigator", {
                mediaDevices: {
                    getDisplayMedia: vi.fn().mockResolvedValue(stream),
                },
            });
            mockSendTransportProduce
                .mockResolvedValueOnce(videoProducer)
                .mockRejectedValueOnce(new Error("audio produce failed"));

            const service = ScreenShareService.getInstance();
            await expect(service.startScreenShare()).rejects.toThrow(
                "audio produce failed",
            );

            expect(videoProducer.close).toHaveBeenCalledTimes(1);
            expect(mockSocketEmit).toHaveBeenCalledWith("producerClosed", {
                producerId: "video-producer-1",
                kind: "video",
            });
        });

        it("resets the starting flag so a subsequent call is not stuck", async () => {
            vi.stubGlobal("navigator", {
                mediaDevices: {
                    getDisplayMedia: vi
                        .fn()
                        .mockRejectedValue(new Error("user denied")),
                },
            });

            const service = ScreenShareService.getInstance();
            await expect(service.startScreenShare()).rejects.toThrow(
                "user denied",
            );

            // Second call must not be silently guarded by starting===true
            const stream2 = makeStream();
            vi.stubGlobal("navigator", {
                mediaDevices: {
                    getDisplayMedia: vi.fn().mockResolvedValue(stream2),
                },
            });
            mockSendTransportProduce.mockResolvedValue(
                makeProducer("video-producer-2"),
            );
            const result = await service.startScreenShare();
            expect(result).not.toBeNull();
        });

        it("re-throws the original error so callers can show UI feedback", async () => {
            vi.stubGlobal("navigator", {
                mediaDevices: {
                    getDisplayMedia: vi
                        .fn()
                        .mockRejectedValue(new Error("NotAllowedError")),
                },
            });

            const service = ScreenShareService.getInstance();
            await expect(service.startScreenShare()).rejects.toThrow(
                "NotAllowedError",
            );
        });
    });

    // ── stopScreenShare() closed guard ──────────────────────────────────

    describe("stopScreenShare() — no-op when producer is already closed", () => {
        it("does not emit producerClosed when screenProducer is null", () => {
            const service = ScreenShareService.getInstance();
            service.stopScreenShare();

            expect(mockSocketEmit).not.toHaveBeenCalledWith(
                "producerClosed",
                expect.anything(),
            );
        });

        it("does not emit producerClosed when screenProducer.closed === true", async () => {
            const producer = makeProducer("vid-1");
            const stream = makeStream();
            vi.stubGlobal("navigator", {
                mediaDevices: {
                    getDisplayMedia: vi.fn().mockResolvedValue(stream),
                },
            });
            mockSendTransportProduce.mockResolvedValue(producer);

            const service = ScreenShareService.getInstance();
            await service.startScreenShare();

            // Simulate the producer being externally closed
            producer.closed = true;

            mockSocketEmit.mockClear();
            service.stopScreenShare();

            expect(mockSocketEmit).not.toHaveBeenCalledWith(
                "producerClosed",
                expect.anything(),
            );
        });
    });

    // ── Singleton concurrency ───────────────────────────────────────────

    describe("startScreenShare() — singleton guard", () => {
        it("returns the existing stream when already starting", async () => {
            const stream = makeStream();
            const getDisplayMedia = vi.fn().mockResolvedValue(stream);
            vi.stubGlobal("navigator", {
                mediaDevices: { getDisplayMedia },
            });

            let resolveProduce!: (v: unknown) => void;
            mockSendTransportProduce.mockReturnValue(
                new Promise((res) => {
                    resolveProduce = res;
                }),
            );

            const service = ScreenShareService.getInstance();
            const first = service.startScreenShare();
            const second = service.startScreenShare();

            // Second call returns null (currentStream not yet set to return) without calling getDisplayMedia again
            expect(await second).toBeNull();
            expect(getDisplayMedia).toHaveBeenCalledTimes(1);

            resolveProduce(makeProducer("v1"));
            await first;
        });
    });
});
