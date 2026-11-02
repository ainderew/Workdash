import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const discovery = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/features/guest/discovery", () => ({
    get GUEST_PUBLIC_DISCOVERY() { return discovery.enabled; },
}));
import { DemoSection } from "./demoSection";
import { HowItWorks } from "../howItWorksSection/howItWorks";

describe("trial discovery", () => {
    it("exposes the trial, descriptive image and tracked link without client JavaScript", () => {
        discovery.enabled = true;
        const html = renderToStaticMarkup(<DemoSection />);
        const page = new DOMParser().parseFromString(html, "text/html");
        expect(page.querySelector("h2")?.textContent).toBe("Try WorkDash free.");
        expect(page.body.textContent).toContain("No sign-up needed.");
        expect(page.body.textContent).toContain("three empty minutes");
        expect(page.body.textContent).toContain("The host can also save the room.");
        const links = [...page.querySelectorAll('a[data-umami-event="cta_guest_try"]')];
        expect(links).toHaveLength(2);
        expect(links.every(link => link.getAttribute("href") === "/try?from=demo")).toBe(true);
        expect(page.querySelector("img")?.getAttribute("alt")).toContain("campfire");
        expect(page.querySelector("img")?.getAttribute("srcset")).toBeTruthy();
        expect(page.querySelector("video")).toBeNull();
        const steps = renderToStaticMarkup(<HowItWorks />);
        expect(steps).toContain("Choose your character");
        expect(steps).toContain('href="/try?from=demo"');
    });

    it("does not advertise anonymous entry when public discovery is disabled", () => {
        discovery.enabled = false;
        const html = renderToStaticMarkup(<DemoSection />);
        expect(html).not.toContain("/try");
        expect(html).not.toContain("No sign-up needed");
        expect(html).not.toContain("20 minutes");
        expect(html).toContain('href="/app"');
        expect(html).toContain("cta_open_room");
    });
});
