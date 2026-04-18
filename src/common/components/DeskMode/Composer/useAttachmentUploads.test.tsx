import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — metadata + upload service are external boundaries for this hook.
// ---------------------------------------------------------------------------

vi.mock("@/common/utils/mediaMetadata", () => ({
    extractImageMetadata: vi.fn().mockResolvedValue({
        width: 10,
        height: 10,
        blurhash: "LEHV6nWB",
    }),
    extractVideoMetadata: vi.fn().mockResolvedValue(null),
}));

const uploadMock = vi.fn();

vi.mock("@/communication/chatV2/uploadService", () => ({
    uploadChatFileForMessageWithProgress: (...args: unknown[]) =>
        uploadMock(...args),
}));

import { useAttachmentUploads } from "./useAttachmentUploads";

beforeEach(() => {
    uploadMock.mockReset();
    // Stub object URL APIs — jsdom accepts them but keep spies simple.
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/abc");
    URL.revokeObjectURL = vi.fn();
});

describe("useAttachmentUploads", () => {
    it("adds files into 'preparing' and then transitions to 'uploaded' on success", async () => {
        uploadMock.mockImplementation(
            async ({ onProgress }: { onProgress: (r: number) => void }) => {
                onProgress(0.5);
                onProgress(1);
                return {
                    fileId: "fid-1",
                    attachment: {
                        id: "fid-1",
                        storageProvider: "GCS",
                        objectKey: "k",
                        originalFileName: "x.png",
                        mimeType: "image/png",
                        sizeBytes: "1",
                        sha256: "sha",
                        isImage: true,
                        width: 10,
                        height: 10,
                        blurhash: "LEHV6nWB",
                        hasPoster: false,
                        durationMs: null,
                    },
                    cancel: vi.fn(),
                };
            },
        );

        const { result } = renderHook(() =>
            useAttachmentUploads({ roomId: "room-1" }),
        );

        const file = new File([new Uint8Array([0])], "x.png", {
            type: "image/png",
        });

        act(() => {
            result.current.addFiles([file]);
        });

        await waitFor(() => {
            expect(result.current.uploads).toHaveLength(1);
            expect(result.current.uploads[0].status).toBe("uploaded");
        });

        expect(result.current.uploads[0].attachment?.id).toBe("fid-1");
        expect(result.current.uploads[0].progress).toBe(1);
    });

    it("flips to 'failed' when the upload throws", async () => {
        uploadMock.mockRejectedValue(new Error("boom"));

        const { result } = renderHook(() =>
            useAttachmentUploads({ roomId: "room-1" }),
        );

        const file = new File([new Uint8Array([0])], "x.png", {
            type: "image/png",
        });

        act(() => {
            result.current.addFiles([file]);
        });

        await waitFor(() => {
            expect(result.current.uploads[0].status).toBe("failed");
            expect(result.current.uploads[0].error).toBe("boom");
        });
    });

    it("takeReadyAttachments returns null while any upload is still uploading", async () => {
        let resolveUpload: ((value: unknown) => void) | null = null;
        uploadMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveUpload = resolve;
                }),
        );

        const { result } = renderHook(() =>
            useAttachmentUploads({ roomId: "room-1" }),
        );

        const file = new File([new Uint8Array([0])], "x.png", {
            type: "image/png",
        });

        act(() => {
            result.current.addFiles([file]);
        });

        await waitFor(() => {
            expect(result.current.uploads[0].status).toBe("uploading");
        });

        expect(result.current.takeReadyAttachments()).toBeNull();

        act(() => {
            resolveUpload?.({
                fileId: "fid-2",
                attachment: {
                    id: "fid-2",
                    storageProvider: "GCS",
                    objectKey: "k",
                    originalFileName: "x.png",
                    mimeType: "image/png",
                    sizeBytes: "1",
                    sha256: "sha",
                    isImage: true,
                    width: 10,
                    height: 10,
                    blurhash: "LEHV6nWB",
                    hasPoster: false,
                    durationMs: null,
                },
                cancel: vi.fn(),
            });
        });

        await waitFor(() => {
            expect(result.current.uploads[0].status).toBe("uploaded");
        });

        let taken: unknown;
        act(() => {
            taken = result.current.takeReadyAttachments();
        });
        expect(taken).toEqual([
            expect.objectContaining({ id: "fid-2", hasPoster: false }),
        ]);
        expect(result.current.uploads).toEqual([]);
    });

    it("reorder() rearranges uploads by clientId order", async () => {
        uploadMock.mockImplementation(async () => ({
            fileId: "fid",
            attachment: {
                id: "fid",
                storageProvider: "GCS",
                objectKey: "k",
                originalFileName: "x.png",
                mimeType: "image/png",
                sizeBytes: "1",
                sha256: "sha",
                isImage: true,
                width: 10,
                height: 10,
                blurhash: null,
                hasPoster: false,
                durationMs: null,
            },
            cancel: vi.fn(),
        }));

        const { result } = renderHook(() =>
            useAttachmentUploads({ roomId: "room-1" }),
        );

        const files = [
            new File([new Uint8Array([0])], "a.png", { type: "image/png" }),
            new File([new Uint8Array([0])], "b.png", { type: "image/png" }),
            new File([new Uint8Array([0])], "c.png", { type: "image/png" }),
        ];

        act(() => {
            result.current.addFiles(files);
        });

        const initialIds = result.current.uploads.map((u) => u.clientId);
        expect(initialIds).toHaveLength(3);

        act(() => {
            result.current.reorder([
                initialIds[2],
                initialIds[0],
                initialIds[1],
            ]);
        });

        expect(result.current.uploads.map((u) => u.clientId)).toEqual([
            initialIds[2],
            initialIds[0],
            initialIds[1],
        ]);
    });

    it("exposes hasActiveUploads and hasFailedUploads flags", async () => {
        uploadMock.mockRejectedValue(new Error("boom"));

        const { result } = renderHook(() =>
            useAttachmentUploads({ roomId: "room-1" }),
        );

        const file = new File([new Uint8Array([0])], "x.png", {
            type: "image/png",
        });

        act(() => {
            result.current.addFiles([file]);
        });

        await waitFor(() => {
            expect(result.current.hasFailedUploads).toBe(true);
            expect(result.current.hasActiveUploads).toBe(false);
        });
    });

    it("throttles concurrent uploads to 4", async () => {
        let inflight = 0;
        let maxInflight = 0;
        const resolvers: Array<(v: unknown) => void> = [];

        uploadMock.mockImplementation(() => {
            inflight += 1;
            maxInflight = Math.max(maxInflight, inflight);
            return new Promise((resolve) => {
                resolvers.push((v) => {
                    inflight -= 1;
                    resolve(v);
                });
            });
        });

        const { result } = renderHook(() =>
            useAttachmentUploads({ roomId: "room-1" }),
        );

        const files = Array.from(
            { length: 6 },
            (_, i) =>
                new File([new Uint8Array([0])], `x${i}.png`, {
                    type: "image/png",
                }),
        );

        act(() => {
            result.current.addFiles(files);
        });

        await waitFor(() => {
            expect(
                result.current.uploads.filter((u) => u.status === "uploading")
                    .length,
            ).toBe(4);
        });

        expect(maxInflight).toBe(4);

        // Drain in two waves: first 4 resolve, which pumps the remaining 2.
        const successPayload = (n: number) => ({
            fileId: `fid-${n}`,
            attachment: {
                id: `fid-${n}`,
                storageProvider: "GCS",
                objectKey: "k",
                originalFileName: "x.png",
                mimeType: "image/png",
                sizeBytes: "1",
                sha256: "sha",
                isImage: true,
                width: 10,
                height: 10,
                blurhash: "LEHV6nWB",
                hasPoster: false,
                durationMs: null,
            },
            cancel: vi.fn(),
        });

        await act(async () => {
            const wave1 = resolvers.splice(0, 4);
            wave1.forEach((r, i) => r(successPayload(i)));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(resolvers.length).toBe(2);
        });

        await act(async () => {
            const wave2 = resolvers.splice(0, 2);
            wave2.forEach((r, i) => r(successPayload(100 + i)));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(
                result.current.uploads.every((u) => u.status === "uploaded"),
            ).toBe(true);
        });
    });
});
