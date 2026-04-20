import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatLastSeen } from "./formatLastSeen";

const NOW = new Date("2026-04-20T12:00:00Z");

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("formatLastSeen", () => {
    it("returns 'just now' for sub-minute durations", () => {
        expect(formatLastSeen(NOW.getTime() - 30_000)).toBe("just now");
        expect(formatLastSeen(NOW.getTime() - 59_999)).toBe("just now");
    });

    it("returns minutes for sub-hour durations", () => {
        expect(formatLastSeen(NOW.getTime() - 5 * 60_000)).toBe("5m ago");
        expect(formatLastSeen(NOW.getTime() - 59 * 60_000)).toBe("59m ago");
    });

    it("returns hours at the 60-minute boundary", () => {
        expect(formatLastSeen(NOW.getTime() - 60 * 60_000)).toBe("1h ago");
    });

    it("returns hours for sub-day durations", () => {
        expect(formatLastSeen(NOW.getTime() - 3 * 3_600_000)).toBe("3h ago");
        expect(formatLastSeen(NOW.getTime() - 23 * 3_600_000)).toBe("23h ago");
    });

    it("returns 'yesterday' for exactly one day", () => {
        expect(formatLastSeen(NOW.getTime() - 24 * 3_600_000)).toBe(
            "yesterday",
        );
    });

    it("returns days for under a week", () => {
        expect(formatLastSeen(NOW.getTime() - 3 * 86_400_000)).toBe("3d ago");
        expect(formatLastSeen(NOW.getTime() - 6 * 86_400_000)).toBe("6d ago");
    });

    it("returns an absolute month-day label past one week", () => {
        const result = formatLastSeen(NOW.getTime() - 30 * 86_400_000);
        expect(result).toMatch(/^on [A-Z][a-z]+ \d+$/);
    });

    it("handles future timestamps as 'just now' (clock skew tolerance)", () => {
        expect(formatLastSeen(NOW.getTime() + 5_000)).toBe("just now");
    });
});
