import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({
    session: null as Record<string, unknown> | null,
    signIn: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
    useSession: () => ({ data: auth.session }),
    signIn: auth.signIn,
}));
vi.mock("sonner", () => ({ toast }));

import useCalendar from "./useCalendar";

const DAY = new Date(2026, 8, 25);

describe("useCalendar", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        auth.session = null;
        toast.mockReset();
        auth.signIn.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("asks a Google user to reconnect when their Calendar access expired", async () => {
        auth.session = { accessToken: "stale", error: "RefreshAccessTokenError" };

        renderHook(() => useCalendar(DAY));

        await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
        const [title, options] = toast.mock.calls[0];
        expect(title).toBe("Google Calendar");
        expect(options.id).toBe("google-calendar-reconnect");
        expect(options.action.label).toBe("Reconnect");
        options.action.onClick();
        expect(auth.signIn).toHaveBeenCalledWith("google");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("doesn't fetch or show an error for email sign-ins, which have no Google token", async () => {
        auth.session = { backendJwt: "jwt" };

        const { result } = renderHook(() => useCalendar(DAY));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(fetchMock).not.toHaveBeenCalled();
        expect(toast).not.toHaveBeenCalled();
        expect(result.current.calendarEvents).toEqual([]);
    });

    it("loads the day's events for a connected Google account", async () => {
        auth.session = { accessToken: "fresh" };
        const events = [{ id: "1", summary: "Standup", start: {}, end: {} }];
        fetchMock.mockResolvedValue({ ok: true, json: async () => events });

        const { result } = renderHook(() => useCalendar(DAY));

        await waitFor(() => expect(result.current.calendarEvents).toEqual(events));
        expect(fetchMock).toHaveBeenCalledWith("/api/calendar?date=2026-09-25");
        expect(toast).not.toHaveBeenCalled();
    });
});
