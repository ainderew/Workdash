import { useCallback, useEffect, useRef, useState } from "react";
import type {
    ChatV2CreateAttachment,
    PendingAttachmentStatus,
    PendingAttachmentUpload,
} from "@/communication/chatV2/_types";
import {
    extractImageMetadata,
    extractVideoMetadata,
    type ImageMetadata,
    type VideoMetadata,
} from "@/common/utils/mediaMetadata";
import {
    uploadChatFileForMessageWithProgress,
    type UploadChatFileWithProgressResult,
} from "@/communication/chatV2/uploadService";

const MAX_CONCURRENT_UPLOADS = 4;
const MAX_ATTACHMENTS_PER_MESSAGE = 10;

const generateClientId = (): string => {
    if (
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
    ) {
        return globalThis.crypto.randomUUID();
    }
    return `upload_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const buildPreviewUrl = (file: File): string | null => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        return null;
    }
    try {
        return URL.createObjectURL(file);
    } catch {
        return null;
    }
};

const makeEntry = (file: File): PendingAttachmentUpload => ({
    clientId: generateClientId(),
    file,
    displayName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    previewUrl: buildPreviewUrl(file),
    progress: null,
    status: "preparing",
    error: null,
    attachment: null,
    cancel: null,
});

type UseAttachmentUploadsArgs = {
    roomId: string | null;
};

type UseAttachmentUploadsResult = {
    uploads: PendingAttachmentUpload[];
    addFiles: (files: File[]) => void;
    removeUpload: (clientId: string) => void;
    cancelUpload: (clientId: string) => void;
    retryUpload: (clientId: string) => void;
    reorder: (nextOrder: string[]) => void;
    clearAll: () => void;
    takeReadyAttachments: () => ChatV2CreateAttachment[] | null;
    hasActiveUploads: boolean;
    hasFailedUploads: boolean;
};

export const useAttachmentUploads = ({
    roomId,
}: UseAttachmentUploadsArgs): UseAttachmentUploadsResult => {
    const [uploads, setUploads] = useState<PendingAttachmentUpload[]>([]);
    const uploadsRef = useRef<PendingAttachmentUpload[]>([]);
    uploadsRef.current = uploads;
    const roomIdRef = useRef<string | null>(roomId);
    roomIdRef.current = roomId;

    const patchUpload = useCallback(
        (clientId: string, patch: Partial<PendingAttachmentUpload>) => {
            setUploads((prev) =>
                prev.map((entry) =>
                    entry.clientId === clientId ? { ...entry, ...patch } : entry,
                ),
            );
        },
        [],
    );

    const drive = useCallback(
        async (clientId: string, file: File) => {
            const currentRoomId = roomIdRef.current;
            if (!currentRoomId) {
                patchUpload(clientId, {
                    status: "failed",
                    error: "No room selected",
                });
                return;
            }

            let imageMeta: ImageMetadata | null = null;
            let videoMeta: VideoMetadata | null = null;
            if (file.type.startsWith("image/")) {
                imageMeta = await extractImageMetadata(file);
            } else if (file.type.startsWith("video/")) {
                videoMeta = await extractVideoMetadata(file);
            }

            patchUpload(clientId, {
                status: "uploading",
                progress: 0,
            });

            try {
                const result: UploadChatFileWithProgressResult =
                    await uploadChatFileForMessageWithProgress({
                        chatId: currentRoomId,
                        file,
                        ...(imageMeta && {
                            imageMeta: {
                                width: imageMeta.width,
                                height: imageMeta.height,
                                blurhash: imageMeta.blurhash,
                            },
                        }),
                        ...(videoMeta && {
                            videoMeta: {
                                width: videoMeta.width,
                                height: videoMeta.height,
                                durationMs: videoMeta.durationMs,
                                poster: videoMeta.poster,
                            },
                        }),
                        onProgress: (ratio) => {
                            patchUpload(clientId, { progress: ratio });
                        },
                    });

                patchUpload(clientId, {
                    status: "uploaded",
                    progress: 1,
                    attachment: result.attachment,
                    cancel: result.cancel,
                });
            } catch (error) {
                const current = uploadsRef.current.find(
                    (entry) => entry.clientId === clientId,
                );
                if (current?.status === "cancelled") return;
                patchUpload(clientId, {
                    status: "failed",
                    error:
                        error instanceof Error ? error.message : "Upload failed",
                });
            }
        },
        [patchUpload],
    );

    const pumpQueue = useCallback(() => {
        const current = uploadsRef.current;
        const inFlight = current.filter(
            (entry) => entry.status === "uploading",
        ).length;
        if (inFlight >= MAX_CONCURRENT_UPLOADS) return;

        const slots = MAX_CONCURRENT_UPLOADS - inFlight;
        const candidates = current
            .filter((entry) => entry.status === "preparing")
            .slice(0, slots);

        for (const entry of candidates) {
            // Mark as uploading synchronously to prevent double-pump; drive() will
            // transition status again but with progress set.
            patchUpload(entry.clientId, { status: "uploading", progress: 0 });
            void drive(entry.clientId, entry.file);
        }
    }, [drive, patchUpload]);

    useEffect(() => {
        pumpQueue();
    }, [uploads, pumpQueue]);

    const addFiles = useCallback((files: File[]) => {
        if (files.length === 0) return;
        setUploads((prev) => {
            const remaining = MAX_ATTACHMENTS_PER_MESSAGE - prev.length;
            if (remaining <= 0) return prev;
            const accepted = files.slice(0, remaining).map(makeEntry);
            return [...prev, ...accepted];
        });
    }, []);

    const removeUpload = useCallback((clientId: string) => {
        setUploads((prev) => {
            const entry = prev.find((u) => u.clientId === clientId);
            if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
            return prev.filter((u) => u.clientId !== clientId);
        });
    }, []);

    const cancelUpload = useCallback(
        (clientId: string) => {
            setUploads((prev) =>
                prev.map((entry) => {
                    if (entry.clientId !== clientId) return entry;
                    entry.cancel?.();
                    return {
                        ...entry,
                        status: "cancelled" as PendingAttachmentStatus,
                        cancel: null,
                    };
                }),
            );
        },
        [],
    );

    const retryUpload = useCallback((clientId: string) => {
        setUploads((prev) =>
            prev.map((entry) =>
                entry.clientId === clientId
                    ? {
                        ...entry,
                        status: "preparing" as PendingAttachmentStatus,
                        error: null,
                        progress: null,
                        attachment: null,
                    }
                    : entry,
            ),
        );
    }, []);

    const reorder = useCallback((nextOrder: string[]) => {
        setUploads((prev) => {
            const byId = new Map(prev.map((entry) => [entry.clientId, entry]));
            const reordered = nextOrder
                .map((id) => byId.get(id))
                .filter((entry): entry is PendingAttachmentUpload => !!entry);
            // Preserve any entries not present in nextOrder (race safety)
            const missing = prev.filter(
                (entry) => !nextOrder.includes(entry.clientId),
            );
            return [...reordered, ...missing];
        });
    }, []);

    const clearAll = useCallback(() => {
        setUploads((prev) => {
            for (const entry of prev) {
                entry.cancel?.();
                if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
            }
            return [];
        });
    }, []);

    const takeReadyAttachments = useCallback((): ChatV2CreateAttachment[] | null => {
        const current = uploadsRef.current;
        if (current.length === 0) return [];
        const notReady = current.some(
            (entry) =>
                entry.status !== "uploaded" && entry.status !== "cancelled",
        );
        if (notReady) return null;
        const ready = current
            .filter((entry): entry is PendingAttachmentUpload & {
                attachment: ChatV2CreateAttachment;
            } => entry.status === "uploaded" && entry.attachment !== null)
            .map((entry) => entry.attachment);
        setUploads((prev) => {
            for (const entry of prev) {
                if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
            }
            return [];
        });
        return ready;
    }, []);

    useEffect(
        () => () => {
            for (const entry of uploadsRef.current) {
                entry.cancel?.();
                if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
            }
        },
        [],
    );

    const hasActiveUploads = uploads.some(
        (entry) => entry.status === "preparing" || entry.status === "uploading",
    );
    const hasFailedUploads = uploads.some(
        (entry) => entry.status === "failed",
    );

    return {
        uploads,
        addFiles,
        removeUpload,
        cancelUpload,
        retryUpload,
        reorder,
        clearAll,
        takeReadyAttachments,
        hasActiveUploads,
        hasFailedUploads,
    };
};
