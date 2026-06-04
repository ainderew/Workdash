import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReadyCheckCountdown } from "./useReadyCheckCountdown";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("useReadyCheckCountdown", () => {
    it("returns 0 when expiresAt is null", () => {
        const { result } = renderHook(() => useReadyCheckCountdown(null));
        expect(result.current).toBe(0);
    });

    it("returns 0 when expiresAt is in the past", () => {
        vi.setSystemTime(new Date("2026-06-03T00:00:30Z"));
        const { result } = renderHook(() =>
            useReadyCheckCountdown("2026-06-03T00:00:00Z"),
        );
        expect(result.current).toBe(0);
    });

    it("rounds up the initial remaining seconds", () => {
        vi.setSystemTime(new Date("2026-06-03T00:00:00Z"));
        const expiresAt = new Date(
            new Date("2026-06-03T00:00:00Z").getTime() + 12_500,
        ).toISOString();
        const { result } = renderHook(() =>
            useReadyCheckCountdown(expiresAt),
        );
        expect(result.current).toBe(13);
    });

    it("ticks down each second", () => {
        vi.setSystemTime(new Date("2026-06-03T00:00:00Z"));
        const expiresAt = new Date(
            new Date("2026-06-03T00:00:00Z").getTime() + 5_000,
        ).toISOString();
        const { result } = renderHook(() =>
            useReadyCheckCountdown(expiresAt),
        );
        expect(result.current).toBe(5);

        act(() => {
            vi.advanceTimersByTime(1_000);
        });
        expect(result.current).toBe(4);

        act(() => {
            vi.advanceTimersByTime(2_000);
        });
        expect(result.current).toBe(2);
    });
});
