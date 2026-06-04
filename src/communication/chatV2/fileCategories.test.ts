import { describe, expect, it } from "vitest";
import {
    formatDurationMs,
    formatFileSize,
    getFileCategory,
    inferMimeType,
} from "./fileCategories";

describe("getFileCategory", () => {
    it("classifies images by mime prefix", () => {
        expect(getFileCategory("image/png")).toBe("image");
        expect(getFileCategory("image/whatever")).toBe("image");
    });

    it("falls back to unknown for unmapped types", () => {
        expect(getFileCategory("application/x-weird")).toBe("unknown");
    });
});

describe("formatFileSize", () => {
    it("formats bytes, KB, MB, GB", () => {
        expect(formatFileSize(512)).toBe("512 B");
        expect(formatFileSize(2048)).toBe("2.0 KB");
        expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
        expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe("2.0 GB");
    });
});

describe("formatDurationMs", () => {
    it("returns empty string for null, undefined, zero, or negative values", () => {
        expect(formatDurationMs(null)).toBe("");
        expect(formatDurationMs(undefined)).toBe("");
        expect(formatDurationMs(0)).toBe("");
        expect(formatDurationMs(-100)).toBe("");
    });

    it("formats under a minute with mm:ss zero-padded", () => {
        expect(formatDurationMs(5_000)).toBe("0:05");
        expect(formatDurationMs(45_000)).toBe("0:45");
    });

    it("formats multi-minute durations", () => {
        expect(formatDurationMs(65_000)).toBe("1:05");
        expect(formatDurationMs(10 * 60 * 1000 + 9_000)).toBe("10:09");
    });

    it("rounds to nearest second", () => {
        expect(formatDurationMs(999)).toBe("0:01");
    });
});

describe("inferMimeType", () => {
    const makeFile = (name: string, type: string): File =>
        new File([new Uint8Array([0])], name, { type });

    it("returns the canonical MIME for an alias", () => {
        expect(
            inferMimeType(makeFile("a.zip", "application/x-zip-compressed")),
        ).toBe("application/zip");
        expect(
            inferMimeType(makeFile("a.rar", "application/x-rar-compressed")),
        ).toBe("application/vnd.rar");
        expect(inferMimeType(makeFile("a.rar", "application/x-rar"))).toBe(
            "application/vnd.rar",
        );
    });

    it("returns the file type unchanged when already allowed", () => {
        expect(inferMimeType(makeFile("a.png", "image/png"))).toBe("image/png");
        expect(inferMimeType(makeFile("a.rar", "application/vnd.rar"))).toBe(
            "application/vnd.rar",
        );
    });

    it("infers .zip and .rar from the extension when type is empty", () => {
        expect(inferMimeType(makeFile("big.zip", ""))).toBe("application/zip");
        expect(inferMimeType(makeFile("big.rar", ""))).toBe(
            "application/vnd.rar",
        );
    });

    it("infers .zip and .rar when browser reports application/octet-stream", () => {
        expect(
            inferMimeType(makeFile("big.zip", "application/octet-stream")),
        ).toBe("application/zip");
        expect(
            inferMimeType(makeFile("big.rar", "application/octet-stream")),
        ).toBe("application/vnd.rar");
    });

    it("returns null for unsupported types", () => {
        expect(
            inferMimeType(makeFile("virus.exe", "application/x-msdownload")),
        ).toBeNull();
        expect(
            inferMimeType(makeFile("mystery.bin", "application/octet-stream")),
        ).toBeNull();
        expect(inferMimeType(makeFile("mystery", ""))).toBeNull();
    });
});
