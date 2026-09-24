import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const bus = vi.hoisted(() => {
    const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
    return {
        on: (event: string, handler: (...args: unknown[]) => void) => {
            if (!handlers.has(event)) handlers.set(event, new Set());
            handlers.get(event)!.add(handler);
        },
        off: (event: string, handler: (...args: unknown[]) => void) => {
            handlers.get(event)?.delete(handler);
        },
        emit: (event: string, ...args: unknown[]) => {
            handlers.get(event)?.forEach((handler) => handler(...args));
        },
        clear: () => handlers.clear(),
    };
});

vi.mock("@/game/EventBus", () => ({ EventBus: bus }));
vi.mock("@/common/store/playerStore", () => ({
    default: { getState: () => ({ playerMap: {}, localPlayerId: null }) },
}));
vi.mock("next/image", () => ({
    default: ({
        alt,
        src,
        className,
    }: {
        alt: string;
        src: string;
        className?: string;
    }) => <img alt={alt} src={src} className={className} />,
}));

import WorldLoadingScreen from "./WorldLoadingScreen";

function isLit(place: string) {
    return screen.getByText(place).parentElement!.classList.contains("is-lit");
}

describe("WorldLoadingScreen", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        bus.clear();
        window.matchMedia = vi
            .fn()
            .mockReturnValue({
                matches: false,
            }) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("lights up the places in order as the world's assets load", () => {
        render(<WorldLoadingScreen active />);

        expect(isLit("Office")).toBe(true);
        expect(isLit("Park")).toBe(false);
        expect(screen.getByRole("status")).toHaveTextContent(
            "Unlocking the office…",
        );

        act(() => bus.emit("world-load-progress", 0.45));

        expect(isLit("Park")).toBe(true);
        expect(isLit("Pond")).toBe(true);
        expect(isLit("Café")).toBe(false);
        expect(screen.getByRole("status")).toHaveTextContent(
            "Filling the pond…",
        );
    });

    it("hands off to the live world once the scene reports in", () => {
        render(<WorldLoadingScreen active />);
        act(() => bus.emit("world-load-progress", 1));
        expect(screen.getByRole("status")).toHaveTextContent(
            "Lighting the campfire…",
        );

        act(() => bus.emit("current-scene-ready"));
        expect(screen.getByRole("status")).toBeInTheDocument(); // zooming in

        act(() => vi.advanceTimersByTime(1000));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("replays a short, already-lit version when coming back from desk mode", () => {
        const { rerender } = render(<WorldLoadingScreen active />);
        act(() => bus.emit("current-scene-ready"));
        act(() => vi.advanceTimersByTime(1000));

        rerender(<WorldLoadingScreen active={false} />);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();

        rerender(<WorldLoadingScreen active />);
        expect(screen.getByRole("status")).toHaveTextContent(
            "Walking back in…",
        );
        expect(isLit("Campfire")).toBe(true);

        act(() => vi.advanceTimersByTime(400)); // brief hold, then zoom in
        act(() => vi.advanceTimersByTime(1000));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("never covers desk mode, even mid-load", () => {
        render(<WorldLoadingScreen active={false} />);
        act(() => bus.emit("world-load-progress", 0.5));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("doesn't trap anyone if the scene never reports in after loading", () => {
        render(<WorldLoadingScreen active />);
        act(() => bus.emit("world-load-progress", 1));
        act(() => vi.advanceTimersByTime(20_000));
        act(() => vi.advanceTimersByTime(1000));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
});
