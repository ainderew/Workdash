import { CONFIG } from "@/common/utils/config";

export type UploadInitResponse = {
    uploadUrl: string;
    uploadMethod: "PUT";
    expiresInSeconds: number;
    requiredHeaders: Record<string, string>;
    attachment: {
        storageProvider: "DO_SPACES" | "S3" | "LOCAL";
        objectKey: string;
        originalFileName: string;
        mimeType: string;
        sizeBytes: string;
        sha256: string;
        isImage: boolean;
    };
};

export const initChatUpload = async (input: {
    roomId: string;
    file: File;
}): Promise<UploadInitResponse> => {
    const jwt = window.__BACKEND_JWT__;
    if (!jwt) {
        throw new Error("Missing backend auth token for upload");
    }

    const response = await fetch(`${CONFIG.SFU_SERVER_URL}/api/chat/uploads/init`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
            roomId: input.roomId,
            fileName: input.file.name,
            mimeType: input.file.type,
            sizeBytes: input.file.size,
        }),
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || "Failed to initialize upload");
    }

    return (await response.json()) as UploadInitResponse;
};

export const uploadFileToSignedUrl = async (
    file: File,
    uploadInit: UploadInitResponse,
) => {
    const response = await fetch(uploadInit.uploadUrl, {
        method: uploadInit.uploadMethod,
        headers: {
            ...uploadInit.requiredHeaders,
        },
        body: file,
    });

    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }
};

export const getSignedAttachmentUrl = async (input: {
    roomId: string;
    objectKey: string;
}): Promise<string> => {
    const jwt = window.__BACKEND_JWT__;
    if (!jwt) {
        throw new Error("Missing backend auth token for signed read URL");
    }

    const response = await fetch(`${CONFIG.SFU_SERVER_URL}/api/chat/uploads/read-url`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || "Failed to get signed read URL");
    }

    const payload = (await response.json()) as { downloadUrl: string };
    return payload.downloadUrl;
};
