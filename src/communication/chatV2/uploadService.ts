import type { ChatV2CreateAttachment } from "@/communication/chatV2/_types";
import { CONFIG } from "@/common/utils/config";

type UploadUrlResponse = {
    fileId: string;
    signedUrl: string;
    uploadMethod: "PUT";
    expiresInMs: number;
    requiredHeaders: Record<string, string>;
    attachment: ChatV2CreateAttachment;
};

type SignedFileUrlResponse = {
    fileId: string;
    signedUrl: string;
    expiresInMs: number;
};

const getBackendJwt = (): string => {
    const jwt = window.__BACKEND_JWT__;
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

const requestUploadUrl = async (
    chatId: string,
    file: File,
): Promise<UploadUrlResponse> => {
    const jwt = getBackendJwt();
    const response = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/chats/${encodeURIComponent(chatId)}/files/upload-url`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({
                filename: file.name,
                contentType: file.type,
                sizeBytes: file.size,
            }),
        },
    );

    if (!response.ok) {
        throw new Error(await parseErrorPayload(response));
    }

    return (await response.json()) as UploadUrlResponse;
};

const uploadToSignedUrl = async (
    file: File,
    signedUrl: string,
    method: "PUT",
    headers: Record<string, string>,
): Promise<void> => {
    const response = await fetch(signedUrl, {
        method,
        headers,
        body: file,
    });

    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }
};

const getSignedFileUrl = async (
    fileId: string,
    kind: "view" | "download",
): Promise<SignedFileUrlResponse> => {
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

    if (!response.ok) {
        throw new Error(await parseErrorPayload(response));
    }

    return (await response.json()) as SignedFileUrlResponse;
};

export const uploadChatFile = async (
    chatId: string,
    file: File,
): Promise<{ fileId: string }> => {
    const uploadInit = await requestUploadUrl(chatId, file);
    await uploadToSignedUrl(
        file,
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
    const uploadInit = await requestUploadUrl(chatId, file);
    await uploadToSignedUrl(
        file,
        uploadInit.signedUrl,
        uploadInit.uploadMethod,
        uploadInit.requiredHeaders,
    );

    return {
        fileId: uploadInit.fileId,
        attachment: uploadInit.attachment,
    };
};

export const getChatFilePreviewUrl = async (fileId: string): Promise<string> => {
    const payload = await getSignedFileUrl(fileId, "view");
    return payload.signedUrl;
};

export const getChatFileDownloadUrl = async (fileId: string): Promise<string> => {
    const payload = await getSignedFileUrl(fileId, "download");
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
