import type { ChatV2CreateAttachment } from "@/communication/chatV2/_types";
import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";
import { getCachedUrl, setCachedUrl } from "./urlCacheService";

type UploadUrlResponseAttachment = Omit<ChatV2CreateAttachment, "hasPoster">;

type UploadUrlResponse = {
    fileId: string;
    signedUrl: string;
    uploadMethod: "PUT";
    expiresInMs: number;
    requiredHeaders: Record<string, string>;
    attachment: UploadUrlResponseAttachment;
    poster?: {
        objectKey: string;
        signedUrl: string;
        uploadMethod: "PUT";
        requiredHeaders: Record<string, string>;
    };
};

const withPosterFlag = (
    attachment: UploadUrlResponseAttachment,
    hasPoster: boolean,
): ChatV2CreateAttachment => ({ ...attachment, hasPoster });

type RequestUploadUrlMetadata = {
    filename: string;
    contentType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    blurhash?: string;
    durationMs?: number;
    poster?: {
        contentType: "image/webp" | "image/jpeg";
        sizeBytes: number;
    };
};

type SignedFileUrlResponse = {
    fileId: string;
    signedUrl: string;
    expiresInMs: number;
};

// --- Image compression constants ---
const MAX_UPLOAD_WIDTH = 1920;
const COMPRESSION_QUALITY = 0.8;
const SKIP_THRESHOLD_BYTES = 200 * 1024; // 200KB

const getBackendJwt = (): string => {
    const jwt = tokenStore.getJwt();
    if (!jwt) {
        throw new Error("Missing backend auth token");
    }
    return jwt;
};

const parseErrorPayload = async (response: Response): Promise<string> => {
    const payload = await response.json().catch(() => ({}));
    if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
    }
    return "Request failed";
};

// --- Phase 3: Client-side image compression ---

type CompressedResult = {
    blob: Blob;
    contentType: string;
    filename: string;
};

const isCompressibleImage = (file: File): boolean =>
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp";

const replaceExtension = (filename: string, ext: string): string => {
    const dotIndex = filename.lastIndexOf(".");
    const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
    return `${base}.${ext}`;
};

const compressImageForUpload = async (
    file: File,
): Promise<CompressedResult> => {
    if (!isCompressibleImage(file) || file.size <= SKIP_THRESHOLD_BYTES) {
        return { blob: file, contentType: file.type, filename: file.name };
    }

    try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;

        let targetWidth = width;
        let targetHeight = height;
        if (width > MAX_UPLOAD_WIDTH) {
            const scale = MAX_UPLOAD_WIDTH / width;
            targetWidth = MAX_UPLOAD_WIDTH;
            targetHeight = Math.round(height * scale);
        }

        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            bitmap.close();
            return { blob: file, contentType: file.type, filename: file.name };
        }

        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        bitmap.close();

        // Try WebP first, fall back to JPEG
        let compressed = await canvas
            .convertToBlob({ type: "image/webp", quality: COMPRESSION_QUALITY })
            .catch(() => null);
        let contentType = "image/webp";
        let filename = replaceExtension(file.name, "webp");

        if (!compressed) {
            compressed = await canvas.convertToBlob({
                type: "image/jpeg",
                quality: COMPRESSION_QUALITY,
            });
            contentType = "image/jpeg";
            filename = replaceExtension(file.name, "jpg");
        }

        // If compression made it bigger, use original
        if (compressed.size >= file.size) {
            return { blob: file, contentType: file.type, filename: file.name };
        }

        return { blob: compressed, contentType, filename };
    } catch {
        return { blob: file, contentType: file.type, filename: file.name };
    }
};

// --- Upload helpers ---

const requestUploadUrl = async (
    chatId: string,
    metadata: RequestUploadUrlMetadata,
): Promise<UploadUrlResponse> => {
    const jwt = getBackendJwt();
    const body: Record<string, unknown> = {
        filename: metadata.filename,
        contentType: metadata.contentType,
        sizeBytes: metadata.sizeBytes,
    };
    if (metadata.width !== undefined) body.width = metadata.width;
    if (metadata.height !== undefined) body.height = metadata.height;
    if (metadata.blurhash !== undefined) body.blurhash = metadata.blurhash;
    if (metadata.durationMs !== undefined) body.durationMs = metadata.durationMs;
    if (metadata.poster !== undefined) body.poster = metadata.poster;

    const response = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/chats/${encodeURIComponent(chatId)}/files/upload-url`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify(body),
        },
    );

    if (!response.ok) {
        throw new Error(await parseErrorPayload(response));
    }

    return (await response.json()) as UploadUrlResponse;
};

type ProgressHandler = (ratio: number) => void;

type UploadHandle = {
    promise: Promise<void>;
    cancel: () => void;
};

const uploadToSignedUrlWithProgress = (
    body: Blob | File,
    signedUrl: string,
    headers: Record<string, string>,
    onProgress: ProgressHandler,
): UploadHandle => {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<void>((resolve, reject) => {
        xhr.open("PUT", signedUrl);
        for (const [k, v] of Object.entries(headers)) {
            xhr.setRequestHeader(k, v);
        }
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress(event.loaded / event.total);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        xhr.send(body);
    });
    return {
        promise,
        cancel: () => xhr.abort(),
    };
};

const uploadToSignedUrl = async (
    body: Blob | File,
    signedUrl: string,
    method: "PUT",
    headers: Record<string, string>,
): Promise<void> => {
    const response = await fetch(signedUrl, {
        method,
        headers,
        body,
    });

    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }
};

const getSignedFileUrl = async (
    fileId: string,
    kind: "view" | "download" | "thumbnail" | "poster",
): Promise<SignedFileUrlResponse | null> => {
    const jwt = getBackendJwt();
    const response = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/chats/files/${encodeURIComponent(fileId)}/${kind}-url`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        },
    );

    if ((kind === "thumbnail" || kind === "poster") && response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(await parseErrorPayload(response));
    }

    return (await response.json()) as SignedFileUrlResponse;
};

// --- Public API ---

export const uploadChatFile = async (
    chatId: string,
    file: File,
): Promise<{ fileId: string }> => {
    const compressed = await compressImageForUpload(file);
    const uploadInit = await requestUploadUrl(chatId, {
        filename: compressed.filename,
        contentType: compressed.contentType,
        sizeBytes: compressed.blob.size,
    });
    await uploadToSignedUrl(
        compressed.blob,
        uploadInit.signedUrl,
        uploadInit.uploadMethod,
        uploadInit.requiredHeaders,
    );

    return { fileId: uploadInit.fileId };
};

export const uploadChatFileForMessage = async (
    chatId: string,
    file: File,
): Promise<{ fileId: string; attachment: ChatV2CreateAttachment }> => {
    const compressed = await compressImageForUpload(file);
    const uploadInit = await requestUploadUrl(chatId, {
        filename: compressed.filename,
        contentType: compressed.contentType,
        sizeBytes: compressed.blob.size,
    });
    await uploadToSignedUrl(
        compressed.blob,
        uploadInit.signedUrl,
        uploadInit.uploadMethod,
        uploadInit.requiredHeaders,
    );

    return {
        fileId: uploadInit.fileId,
        attachment: withPosterFlag(uploadInit.attachment, false),
    };
};

export type UploadChatFileWithProgressInput = {
    chatId: string;
    file: File;
    imageMeta?: { width: number; height: number; blurhash: string | null };
    videoMeta?: {
        width: number;
        height: number;
        durationMs: number;
        poster: File | null;
    };
    onProgress: ProgressHandler;
};

export type UploadChatFileWithProgressResult = {
    fileId: string;
    attachment: ChatV2CreateAttachment;
    cancel: () => void;
};

const confirmPosterUploaded = async (
    fileId: string,
    posterObjectKey: string,
): Promise<void> => {
    const jwt = getBackendJwt();
    const response = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/chats/files/${encodeURIComponent(fileId)}/poster`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ posterObjectKey }),
        },
    );
    if (!response.ok) {
        throw new Error(await parseErrorPayload(response));
    }
};

export { confirmPosterUploaded };

export const uploadChatFileForMessageWithProgress = async (
    input: UploadChatFileWithProgressInput,
): Promise<UploadChatFileWithProgressResult> => {
    const compressed = await compressImageForUpload(input.file);
    const posterBody = input.videoMeta?.poster ?? null;

    const uploadInit = await requestUploadUrl(input.chatId, {
        filename: compressed.filename,
        contentType: compressed.contentType,
        sizeBytes: compressed.blob.size,
        ...(input.imageMeta?.width !== undefined && {
            width: input.imageMeta.width,
        }),
        ...(input.imageMeta?.height !== undefined && {
            height: input.imageMeta.height,
        }),
        ...(input.videoMeta?.width !== undefined &&
            input.imageMeta?.width === undefined && {
                width: input.videoMeta.width,
            }),
        ...(input.videoMeta?.height !== undefined &&
            input.imageMeta?.height === undefined && {
                height: input.videoMeta.height,
            }),
        ...(input.imageMeta?.blurhash && {
            blurhash: input.imageMeta.blurhash,
        }),
        ...(input.videoMeta?.durationMs !== undefined && {
            durationMs: input.videoMeta.durationMs,
        }),
        ...(posterBody && {
            poster: {
                contentType: "image/webp" as const,
                sizeBytes: posterBody.size,
            },
        }),
    });

    const mainHandle = uploadToSignedUrlWithProgress(
        compressed.blob,
        uploadInit.signedUrl,
        uploadInit.requiredHeaders,
        input.onProgress,
    );

    let posterHandle: UploadHandle | null = null;
    let cancelled = false;
    const cancel = () => {
        cancelled = true;
        mainHandle.cancel();
        posterHandle?.cancel();
    };

    await mainHandle.promise;

    let hasPoster = false;

    if (posterBody && uploadInit.poster) {
        posterHandle = uploadToSignedUrlWithProgress(
            posterBody,
            uploadInit.poster.signedUrl,
            uploadInit.poster.requiredHeaders,
            () => {},
        );
        try {
            await posterHandle.promise;
            await confirmPosterUploaded(
                uploadInit.fileId,
                uploadInit.poster.objectKey,
            );
            hasPoster = true;
        } catch (error) {
            console.warn(
                "Poster upload failed; continuing without poster",
                error,
            );
        }
    }

    if (cancelled) throw new Error("Upload cancelled");

    return {
        fileId: uploadInit.fileId,
        attachment: withPosterFlag(uploadInit.attachment, hasPoster),
        cancel,
    };
};

export const getChatFilePreviewUrl = async (
    fileId: string,
): Promise<string> => {
    const cached = getCachedUrl(fileId, "view");
    if (cached) return cached;

    const payload = await getSignedFileUrl(fileId, "view");
    if (!payload) throw new Error("Failed to get preview URL");
    setCachedUrl(fileId, "view", payload.signedUrl);
    return payload.signedUrl;
};

export const getChatFileThumbnailUrl = async (
    fileId: string,
): Promise<string | null> => {
    const cached = getCachedUrl(fileId, "thumbnail");
    if (cached) return cached;

    const payload = await getSignedFileUrl(fileId, "thumbnail");
    if (!payload) return null;
    setCachedUrl(fileId, "thumbnail", payload.signedUrl);
    return payload.signedUrl;
};

export const getChatFilePosterUrl = async (
    fileId: string,
): Promise<string | null> => {
    const cached = getCachedUrl(fileId, "poster");
    if (cached) return cached;

    const payload = await getSignedFileUrl(fileId, "poster");
    if (!payload) return null;
    setCachedUrl(fileId, "poster", payload.signedUrl);
    return payload.signedUrl;
};

export const getChatFileDownloadUrl = async (
    fileId: string,
): Promise<string> => {
    const cached = getCachedUrl(fileId, "download");
    if (cached) return cached;

    const payload = await getSignedFileUrl(fileId, "download");
    if (!payload) throw new Error("Failed to get download URL");
    setCachedUrl(fileId, "download", payload.signedUrl);
    return payload.signedUrl;
};

export const downloadChatFile = async (fileId: string): Promise<void> => {
    const signedUrl = await getChatFileDownloadUrl(fileId);
    window.open(signedUrl, "_blank", "noopener,noreferrer");
};

// Deprecated compatibility wrapper; callsites will be removed during the preview/download phase.
export const getSignedAttachmentUrl = async (_input: {
    roomId: string;
    objectKey: string;
}): Promise<string> => {
    void _input;
    throw new Error("Legacy attachment URL resolution is no longer supported");
};
