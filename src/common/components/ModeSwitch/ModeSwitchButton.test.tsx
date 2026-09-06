import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const toggleInteractionMode = vi.fn();
let interactionMode: "world" | "desk" = "world";

vi.mock("@/common/store/uiStore", () => {
    const hook = (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ interactionMode, toggleInteractionMode });
    return { default: hook };
});

import { ModeSwitchButton } from "./ModeSwitchButton";

describe("ModeSwitchButton", () => {
    beforeEach(() => {
        toggleInteractionMode.mockClear();
    });

    it("offers desk mode while the user is in world mode", () => {
        interactionMode = "world";
        render(<ModeSwitchButton />);

        expect(
            screen.getByRole("button", { name: "Switch to Desk Mode" }),
        ).toBeInTheDocument();
    });

    it("offers 2D mode while the user is in desk mode", () => {
        interactionMode = "desk";
        render(<ModeSwitchButton />);

        expect(
            screen.getByRole("button", { name: "Switch to 2D Mode" }),
        ).toBeInTheDocument();
    });

    it("toggles the interaction mode when tapped", () => {
        interactionMode = "world";
        render(<ModeSwitchButton />);

        fireEvent.click(
            screen.getByRole("button", { name: "Switch to Desk Mode" }),
        );

        expect(toggleInteractionMode).toHaveBeenCalledTimes(1);
    });

    it("renders the label alongside the icon when asked", () => {
        interactionMode = "desk";
        render(<ModeSwitchButton showLabel />);

        expect(screen.getByText("2D Mode")).toBeInTheDocument();
    });
});
