import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const player = { physicsState: { x: 100, y: 100 } };

const bus = vi.hoisted(() => {
    const handlers = new Map<string, Set<(payload: unknown) => void>>();
    return {
        on: (event: string, handler: (payload: unknown) => void) => {
            if (!handlers.has(event)) handlers.set(event, new Set());
            handlers.get(event)!.add(handler);
        },
        off: (event: string, handler: (payload: unknown) => void) => {
            handlers.get(event)?.delete(handler);
        },
        emit: (event: string, payload: unknown) => {
            handlers.get(event)?.forEach((handler) => handler(payload));
        },
    };
});

vi.mock("@/game/EventBus", () => ({ EventBus: bus }));

vi.mock("@/common/store/playerStore", () => ({
    default: {
        getState: () => ({ localPlayerId: "me", playerMap: { me: player } }),
    },
}));

import useUiStore from "@/common/store/uiStore";
import OnboardingTips from "./OnboardingTips";
import { TIPS_STORAGE_KEY } from "./constants";

function Controls() {
    return (
        <>
            <button type="button" data-onboarding-target="chat">
                Chat
            </button>
            <button type="button" data-onboarding-target="desk-mode">
                Switch to Desk Mode
            </button>
            <button type="button" data-onboarding-target="world-mode">
                Switch to 2D Mode
            </button>
            <OnboardingTips />
        </>
    );
}

/** Steps time in frames so React commits between timers, as it would live. */
const advance = async (ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 50) {
        await act(async () => {
            vi.advanceTimersByTime(50);
        });
    }
};

/** Lets the tips see where the avatar stands, then walks it a few tiles. */
const walk = async () => {
    await advance(300);
    player.physicsState = { x: player.physicsState.x + 64, y: player.physicsState.y };
    await advance(300);
    await advance(2500);
};

const seen = () => JSON.parse(localStorage.getItem(TIPS_STORAGE_KEY) ?? "{}");

describe("OnboardingTips", () => {
    beforeEach(() => {
        vi.useFakeTimers({
            toFake: [
                "setTimeout",
                "clearTimeout",
                "setInterval",
                "clearInterval",
                "Date",
                "requestAnimationFrame",
                "cancelAnimationFrame",
            ],
        });
        localStorage.clear();
        player.physicsState = { x: 100, y: 100 };
        useUiStore.setState({
            interactionMode: "world",
            modeSwitchCount: 0,
            isChatWindowOpen: false,
            isMembersUiOpen: false,
            isCalendarUiOpen: false,
        });
        // jsdom has no layout; give every control a real-looking box
        vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
            left: 1069,
            top: 830,
            width: 36,
            height: 36,
            right: 1105,
            bottom: 866,
            x: 1069,
            y: 830,
            toJSON: () => ({}),
        } as DOMRect);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("waits for the first steps, then lights the chat button", async () => {
        render(<Controls />);
        await advance(5000);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await walk();

        expect(
            screen.getByRole("dialog", { name: "Chat without leaving the world" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute(
            "data-onboarding-lit",
        );
        expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    it("retires a tip for good when dismissed", async () => {
        render(<Controls />);
        await walk();

        fireEvent.click(screen.getByRole("button", { name: "Got it" }));

        expect(
            screen.queryByRole("dialog", { name: "Chat without leaving the world" }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Chat" })).not.toHaveAttribute(
            "data-onboarding-lit",
        );
        expect(seen()).toEqual({ chat: true });
    });

    it("skips the chat tip once chat is opened, then offers desk mode on a later walk", async () => {
        render(<Controls />);
        await act(async () => useUiStore.getState().toggleChatWindow());
        await walk();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(seen()).toEqual({ chat: true });

        await act(async () => useUiStore.getState().toggleChatWindow());
        await advance(3000);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await walk();

        expect(
            screen.getByRole("dialog", { name: "Heads down? Pull up a desk" }),
        ).toBeInTheDocument();
    });

    it("switching to desk mode retires the desk tip and shows the way back", async () => {
        localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify({ chat: true }));
        render(<Controls />);
        await walk();

        await act(async () => useUiStore.getState().toggleInteractionMode());
        expect(seen()).toEqual({ chat: true, desk: true });
        await advance(1000);

        expect(
            screen.getByRole("dialog", { name: "The world's one click away" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Switch to 2D Mode" }),
        ).toHaveAttribute("data-onboarding-lit");
    });

    it("doesn't count restoring the saved mode on load as a switch", async () => {
        render(<Controls />);
        await act(async () => useUiStore.getState().setInteractionMode("desk"));
        await advance(1000);

        expect(seen()).toEqual({});
        expect(
            screen.getByRole("dialog", { name: "The world's one click away" }),
        ).toBeInTheDocument();
    });

    it("waits while the seat prompt is up and shows once the player walks off", async () => {
        render(<Controls />);
        await act(async () => bus.emit("seat-prompt", { state: "free", seatId: "chair-1" }));
        await walk();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await act(async () => bus.emit("seat-prompt", null));
        await advance(100);

        expect(
            screen.getByRole("dialog", { name: "Chat without leaving the world" }),
        ).toBeInTheDocument();
    });

    it("closes on Escape", async () => {
        render(<Controls />);
        await walk();

        fireEvent.keyDown(window, { key: "Escape" });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(seen()).toEqual({ chat: true });
    });

    it("shows nothing once every tip has been seen", async () => {
        localStorage.setItem(
            TIPS_STORAGE_KEY,
            JSON.stringify({ chat: true, desk: true, world: true }),
        );
        render(<Controls />);

        await walk();
        await advance(25_000);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
