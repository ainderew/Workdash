import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ChatV2Attachment } from "@/communication/chatV2/_types";
import { AttachmentRenderer } from "./AttachmentRenderer";

vi.mock("@/communication/chatV2/uploadService", () => ({
    getChatFilePreviewUrl: vi.fn().mockResolvedValue("https://cdn/preview"),
    getChatFilePosterUrl: vi.fn().mockResolvedValue("https://cdn/poster"),
}));

vi.mock("@/communication/chatV2/urlCacheService", () => ({
    invalidateCachedUrl: vi.fn(),
}));

const baseAttachment: Omit<ChatV2Attachment, "id" | "mimeType"> = {
    messageId: "msg-1",
    storageProvider: "GCS",
    objectKey: "k",
    originalFileName: "x.png",
    sizeBytes: "1",
    sha256: "sha",
    isImage: false,
    width: null,
    height: null,
    blurhash: null,
    hasPoster: false,
    durationMs: null,
    expiresAt: null,
    expiredAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
};

const makeAttachment = (
    overrides: Partial<ChatV2Attachment> &
        Pick<ChatV2Attachment, "id" | "mimeType">,
): ChatV2Attachment => ({
    ...baseAttachment,
    isImage: overrides.mimeType.startsWith("image/"),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe("AttachmentRenderer", () => {
    it("renders 4 image cells for 4 image attachments", () => {
        const attachments = [
            makeAttachment({ id: "a", mimeType: "image/png" }),
            makeAttachment({ id: "b", mimeType: "image/png" }),
            makeAttachment({ id: "c", mimeType: "image/png" }),
            makeAttachment({ id: "d", mimeType: "image/png" }),
        ];
        render(
            <AttachmentRenderer
                attachments={attachments}
                urlsByFileId={{}}
                onImageTileClick={vi.fn()}
                onDownloadAttachment={vi.fn()}
            />,
        );
        expect(
            screen.getAllByRole("button", { name: /^Open/ }),
        ).toHaveLength(4);
    });

    it("renders 5 tiles with a +2 overflow cell for 7 images", () => {
        const attachments = Array.from({ length: 7 }, (_, i) =>
            makeAttachment({ id: `i-${i}`, mimeType: "image/png" }),
        );
        render(
            <AttachmentRenderer
                attachments={attachments}
                urlsByFileId={{}}
                onImageTileClick={vi.fn()}
                onDownloadAttachment={vi.fn()}
            />,
        );
        expect(
            screen.getAllByRole("button", { name: /^Open/ }),
        ).toHaveLength(5);
        expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("clicking the +N overflow cell opens the lightbox at the last visible index", () => {
        const onImageTileClick = vi.fn();
        const attachments = Array.from({ length: 8 }, (_, i) =>
            makeAttachment({
                id: `i-${i}`,
                mimeType: "image/png",
            }),
        );
        render(
            <AttachmentRenderer
                attachments={attachments}
                urlsByFileId={{}}
                onImageTileClick={onImageTileClick}
                onDownloadAttachment={vi.fn()}
            />,
        );
        const overflow = screen.getByText("+3").closest("button");
        expect(overflow).toBeInTheDocument();
        fireEvent.click(overflow!);
        expect(onImageTileClick).toHaveBeenCalledWith(
            "i-4",
            expect.any(String),
            4,
        );
    });

    it("renders a video tile with a play affordance (not autoplaying)", () => {
        const attachments = [
            makeAttachment({
                id: "v",
                mimeType: "video/mp4",
                originalFileName: "clip.mp4",
                hasPoster: true,
                durationMs: 12_000,
            }),
        ];
        render(
            <AttachmentRenderer
                attachments={attachments}
                urlsByFileId={{
                    v: {
                        thumbnailUrl: null,
                        viewUrl: "https://cdn/v",
                        posterUrl: "https://cdn/p",
                    },
                }}
                onImageTileClick={vi.fn()}
                onDownloadAttachment={vi.fn()}
            />,
        );
        expect(
            screen.getByRole("button", { name: /Play clip.mp4/ }),
        ).toBeInTheDocument();
        expect(screen.getByText("0:12")).toBeInTheDocument();
    });

    it("renders a file card with Open + Download for PDFs", () => {
        const attachments = [
            makeAttachment({
                id: "pdf",
                mimeType: "application/pdf",
                originalFileName: "report.pdf",
            }),
        ];
        render(
            <AttachmentRenderer
                attachments={attachments}
                urlsByFileId={{
                    pdf: {
                        thumbnailUrl: null,
                        viewUrl: "https://cdn/pdf",
                        posterUrl: null,
                    },
                }}
                onImageTileClick={vi.fn()}
                onDownloadAttachment={vi.fn()}
            />,
        );
        expect(screen.getByRole("link", { name: /Open/ })).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Download/ }),
        ).toBeInTheDocument();
    });

    it("renders an expired card with 'This file has expired' when expiredAt is set", () => {
        const attachments = [
            makeAttachment({
                id: "e",
                mimeType: "application/pdf",
                originalFileName: "old.pdf",
                expiredAt: "2026-01-01T00:00:00.000Z",
            }),
        ];
        render(
            <AttachmentRenderer
                attachments={attachments}
                urlsByFileId={{}}
                onImageTileClick={vi.fn()}
                onDownloadAttachment={vi.fn()}
            />,
        );
        expect(
            screen.getByText("This file has expired"),
        ).toBeInTheDocument();
    });
});
