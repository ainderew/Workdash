import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./trackEvent";

afterEach(() => {
    delete window.umami;
});

describe("trackEvent", () => {
    it("does nothing when the analytics script isn't loaded", () => {
        expect(() => trackEvent("den_created")).not.toThrow();
    });

    it("sends the event and its data to Umami", () => {
        const track = vi.fn();
        window.umami = { track };
        trackEvent("sign_in_started", { method: "google" });
        expect(track).toHaveBeenCalledWith("sign_in_started", { method: "google" });
    });

    it("never lets an analytics failure reach the caller", () => {
        window.umami = {
            track: () => {
                throw new Error("blocked");
            },
        };
        expect(() => trackEvent("den_created")).not.toThrow();
    });
});
