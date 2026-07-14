import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub matchMedia (jsdom doesn't provide it by default)
const matchMediaMock = vi.fn().mockReturnValue({ matches: false });
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: matchMediaMock,
});

function makeMockAudioContext() {
    const oscStartSpy = vi.fn();
    const node = () => ({
        type: "",
        frequency: { value: 0 },
        Q: { value: 0 },
        gain: {
            value: 0,
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn((target: unknown) => target),
        start: oscStartSpy,
        stop: vi.fn(),
    });
    const ctx = {
        currentTime: 0,
        state: "running",
        destination: {},
        resume: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn(node),
        createBiquadFilter: vi.fn(node),
        createGain: vi.fn(node),
    };
    return { ctx, oscStartSpy };
}

// The module caches its AudioContext, so re-import fresh per test.
async function importSound() {
    vi.resetModules();
    return import("./readyCheckSound");
}

beforeEach(() => {
    matchMediaMock.mockReturnValue({ matches: false });
    delete (window as { AudioContext?: unknown }).AudioContext;
});

describe("playSummonChime", () => {
    it("starts oscillators through the Web Audio API when available", async () => {
        const { ctx, oscStartSpy } = makeMockAudioContext();
        (window as { AudioContext?: unknown }).AudioContext = vi
            .fn()
            .mockReturnValue(ctx);

        const { playSummonChime } = await importSound();
        playSummonChime();

        expect(ctx.createOscillator).toHaveBeenCalled();
        expect(oscStartSpy).toHaveBeenCalled();
    });

    it("does not create an AudioContext when prefers-reduced-motion is reduce", async () => {
        matchMediaMock.mockReturnValue({ matches: true });
        const ctxCtor = vi.fn();
        (window as { AudioContext?: unknown }).AudioContext = ctxCtor;

        const { playSummonChime } = await importSound();
        playSummonChime();

        expect(ctxCtor).not.toHaveBeenCalled();
    });

    it("is a silent no-op when the Web Audio API is unavailable", async () => {
        const { playSummonChime } = await importSound();
        expect(() => playSummonChime()).not.toThrow();
    });
});

describe("playLockedInChime", () => {
    it("respects prefers-reduced-motion", async () => {
        matchMediaMock.mockReturnValue({ matches: true });
        const ctxCtor = vi.fn();
        (window as { AudioContext?: unknown }).AudioContext = ctxCtor;

        const { playLockedInChime } = await importSound();
        playLockedInChime();

        expect(ctxCtor).not.toHaveBeenCalled();
    });
});
