import React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Pricing } from "./pricing";

beforeAll(() => {
    class Noop {
        observe() {}
        disconnect() {}
        unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", Noop);
});

function card(name: string) {
    return screen.getByRole("heading", { level: 2, name }).closest("article") as HTMLElement;
}

describe("Pricing", () => {
    it("is titled by the page's only top-level heading", () => {
        render(<Pricing />);
        const title = screen.getByRole("heading", { level: 1 });
        expect(title).toHaveTextContent("Free now, extras later");
        expect(screen.getByRole("region", { name: "Free now, extras later" })).toBeInTheDocument();
    });

    it("lets you start free and keeps the paid plans off sale", () => {
        render(<Pricing />);
        expect(within(card("Free")).getByRole("link", { name: "Pull up a chair" })).toHaveAttribute("href", "/app");
        for (const name of ["Den+", "Regular"]) {
            expect(within(card(name)).getByText("Planned")).toBeInTheDocument();
            expect(within(card(name)).getByRole("button", { name: "Not for sale yet" })).toBeDisabled();
        }
    });

    it("switches the paid prices between monthly and yearly", () => {
        render(<Pricing />);
        expect(within(card("Den+")).getByText("$8")).toBeInTheDocument();
        expect(within(card("Regular")).getByText("$4")).toBeInTheDocument();

        const yearly = screen.getByRole("button", { name: "Yearly 2 months free" });
        fireEvent.click(yearly);

        expect(yearly).toHaveAttribute("aria-pressed", "true");
        expect(within(card("Den+")).getByText("$80")).toBeInTheDocument();
        expect(within(card("Regular")).getByText("$40")).toBeInTheDocument();
        expect(within(card("Free")).getByText("$0")).toBeInTheDocument();
    });
});
