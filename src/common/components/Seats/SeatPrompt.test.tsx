import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

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
        emit: vi.fn((event: string, ...args: unknown[]) => {
            handlers.get(event)?.forEach((handler) => handler(...args));
        }),
        clear: () => handlers.clear(),
    };
});
vi.mock("@/game/EventBus", () => ({ EventBus: bus }));

import SeatPrompt from "./SeatPrompt";
import { SEAT_PROMPT_EVENT, SEAT_TOGGLE_EVENT } from "@/game/seats/seatEvents";

describe("SeatPrompt", () => {
    beforeEach(() => {
        bus.clear();
        bus.emit.mockClear();
    });

    it("stays out of the way until you're next to a seat", () => {
        render(<SeatPrompt />);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("offers a free seat and sits you down when clicked", () => {
        render(<SeatPrompt />);
        act(() => bus.emit(SEAT_PROMPT_EVENT, { state: "free", seatId: "142" }));

        fireEvent.click(screen.getByRole("button", { name: /sit/i }));
        expect(bus.emit).toHaveBeenCalledWith(SEAT_TOGGLE_EVENT);
    });

    it("greys out a taken seat and says who is sitting there", () => {
        render(<SeatPrompt />);
        act(() => bus.emit(SEAT_PROMPT_EVENT, { state: "taken", seatId: "142", occupant: "bob" }));

        expect(screen.getByRole("button", { name: /seat taken/i })).toBeDisabled();
        expect(screen.getByRole("status")).toHaveTextContent("bob is sitting here");
    });

    it("lets a seated player stand up", () => {
        render(<SeatPrompt />);
        act(() => bus.emit(SEAT_PROMPT_EVENT, { state: "seated", seatId: "142" }));

        fireEvent.click(screen.getByRole("button", { name: /stand up/i }));
        expect(bus.emit).toHaveBeenCalledWith(SEAT_TOGGLE_EVENT);

        act(() => bus.emit(SEAT_PROMPT_EVENT, null));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
});
