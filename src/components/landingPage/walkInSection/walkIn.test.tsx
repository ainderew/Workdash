import React from "react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalkIn } from "./walkIn";

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("framer-motion", async (importOriginal) => {
    const actual = await importOriginal<typeof import("framer-motion")>();
    return { ...actual, useReducedMotion: () => reduced.value };
});

beforeAll(() => {
    class Noop {
        observe() {}
        disconnect() {}
        unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", Noop);
    vi.stubGlobal("IntersectionObserver", Noop);
});

describe("WalkIn", () => {
    it("is the page's features section, named by its title", () => {
        render(<WalkIn />);
        const section = screen.getByRole("region", { name: "What it actually does." });
        expect(section).toHaveAttribute("id", "features");
    });

    it("puts every feature in the page as real text", () => {
        render(<WalkIn />);
        for (const name of ["Walk in. Start talking.", "Step in. Cameras up.", "Calm room. Loud moments."]) {
            expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
        }
        expect(screen.getByRole("heading", { level: 3, name: /One glance tells you who’s on the couch/ })).toBeInTheDocument();
    });

    it("ends on a way into the app", () => {
        render(<WalkIn />);
        expect(screen.getByRole("link", { name: "Open the room" })).toHaveAttribute("href", "/app");
    });

    it("shows still frames instead of a pinned film when motion is reduced", () => {
        reduced.value = true;
        render(<WalkIn />);
        expect(screen.getAllByRole("link", { name: "Open the room" }).length).toBeGreaterThan(1);
        reduced.value = false;
    });
});
