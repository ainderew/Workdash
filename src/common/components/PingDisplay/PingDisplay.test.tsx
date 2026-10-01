import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/game/EventBus", () => ({
    EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

// jsdom doesn't implement matchMedia. Only max-width queries can match, and
// only in tests that opt into a narrow viewport.
let isNarrowViewport = false;
window.matchMedia = vi.fn((query: string) => ({
    matches: isNarrowViewport && query.includes("max-width"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

import PingDisplay from "./PingDisplay";
import useUiStore from "@/common/store/uiStore";

beforeEach(() => {
    isNarrowViewport = false;
    useUiStore.setState({ ping: 42, interactionMode: "world", isChatWindowOpen: false });
});

describe("PingDisplay", () => {
    it("shows the ping in world mode", () => {
        render(<PingDisplay />);

        expect(screen.getByText("42ms")).toBeInTheDocument();
    });

    it("stays beside the open chat drawer on wide screens", () => {
        useUiStore.setState({ isChatWindowOpen: true });
        render(<PingDisplay />);

        expect(screen.getByText("42ms")).toBeInTheDocument();
    });

    // On phones and tablets the drawer reaches the left edge, and the badge
    // covered its header buttons.
    it("hides while the chat drawer covers it on narrower screens", () => {
        isNarrowViewport = true;
        useUiStore.setState({ isChatWindowOpen: true });
        render(<PingDisplay />);

        expect(screen.queryByText("42ms")).not.toBeInTheDocument();
    });
});
