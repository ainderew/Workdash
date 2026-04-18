import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
    extractImageMetadata,
    extractVideoMetadata,
} from "./mediaMetadata";

describe("extractImageMetadata", () => {
    it("returns null for non-image mime types", async () => {
        const file = new File(["text"], "doc.txt", { type: "text/plain" });
        expect(await extractImageMetadata(file)).toBeNull();
    });

    it("returns null when createImageBitmap is unavailable or throws", async () => {
        const original = globalThis.createImageBitmap;
        // Force a throwing bitmap factory — jsdom doesn't ship one, so we inject.
        (
            globalThis as unknown as { createImageBitmap: unknown }
        ).createImageBitmap = vi.fn().mockRejectedValue(new Error("nope"));
        const file = new File(
            [new Uint8Array([0, 0])],
            "x.png",
            { type: "image/png" },
        );
        expect(await extractImageMetadata(file)).toBeNull();
        (
            globalThis as unknown as { createImageBitmap: unknown }
        ).createImageBitmap = original;
    });

    it("returns width/height from a stubbed ImageBitmap", async () => {
        const close = vi.fn();
        (
            globalThis as unknown as { createImageBitmap: unknown }
        ).createImageBitmap = vi.fn().mockResolvedValue({
            width: 800,
            height: 600,
            close,
        });

        const file = new File(
            [new Uint8Array([0, 0])],
            "x.png",
            { type: "image/png" },
        );

        const result = await extractImageMetadata(file);
        expect(result).not.toBeNull();
        expect(result?.width).toBe(800);
        expect(result?.height).toBe(600);
        // blurhash may be null in jsdom (no real canvas pixels), but the field
        // must be present
        expect(Object.prototype.hasOwnProperty.call(result, "blurhash")).toBe(
            true,
        );
        expect(close).toHaveBeenCalled();
    });
});

describe("extractVideoMetadata", () => {
    let revokeSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        revokeSpy = vi.fn();
        (
            URL as unknown as {
                createObjectURL: (blob: Blob) => string;
                revokeObjectURL: (url: string) => void;
            }
        ).createObjectURL = vi
            .fn()
            .mockReturnValue("blob:http://localhost/xyz");
        (
            URL as unknown as {
                revokeObjectURL: (url: string) => void;
            }
        ).revokeObjectURL = revokeSpy;
    });

    afterEach(() => {
        revokeSpy.mockReset();
    });

    it("returns null for non-video mime types", async () => {
        const file = new File(["text"], "doc.txt", { type: "text/plain" });
        expect(await extractVideoMetadata(file)).toBeNull();
    });

    it("revokes the object URL even when the video load fails", async () => {
        const file = new File(
            [new Uint8Array([0, 0])],
            "bad.mp4",
            { type: "video/mp4" },
        );
        // jsdom's <video> never fires loadedmetadata — our wrapper times out
        // when the error event fires. Trigger it synchronously.
        const originalAddEventListener =
            HTMLMediaElement.prototype.addEventListener;
        HTMLMediaElement.prototype.addEventListener = function (
            this: HTMLMediaElement,
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions,
        ) {
            if (type === "error" && typeof listener === "function") {
                setTimeout(() => listener.call(this, new Event("error")), 0);
            }
            return originalAddEventListener.call(
                this,
                type,
                listener,
                options,
            );
        };

        const result = await extractVideoMetadata(file);
        expect(result).toBeNull();
        expect(revokeSpy).toHaveBeenCalledWith("blob:http://localhost/xyz");

        HTMLMediaElement.prototype.addEventListener = originalAddEventListener;
    });
});
