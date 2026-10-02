import React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Faq, FAQ_ITEMS } from "./faq";

beforeAll(() => {
    class Noop {
        observe() {}
        disconnect() {}
        unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", Noop);
});

describe("Faq", () => {
    it("keeps every answer in the page, even collapsed, so crawlers can read it", () => {
        const { container } = render(<Faq />);
        for (const item of FAQ_ITEMS) {
            expect(container).toHaveTextContent(item.a);
        }
    });

    it("opens a collapsed answer when its question is clicked", () => {
        render(<Faq />);
        const question = screen.getByRole("button", { name: FAQ_ITEMS[1].q });
        const answer = screen.getByText(FAQ_ITEMS[1].a);

        expect(question).toHaveAttribute("aria-expanded", "false");
        expect(answer).not.toBeVisible();

        fireEvent.click(question);

        expect(question).toHaveAttribute("aria-expanded", "true");
        expect(answer).toBeVisible();
    });
});
