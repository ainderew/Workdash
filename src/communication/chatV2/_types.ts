export type ChatV2RoomCategory = {
    id: string;
    workspaceId: string;
    name: string;
    position: number;
    createdByUserId: number;
    createdAt: string | Date;
    updatedAt: string | Date;
};

export type ChatV2Room = {
    id: string;
    workspaceId: string;
    workspace?: {
        id: string;
        name: string;
    };
    viewerRole?: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY" | null;
    categoryId: string | null;
    position: number;
    name: string;
    slug: string;
    topic: string | null;
    visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    type: "TEXT" | "VOICE" | "ANNOUNCEMENT";
    isArchived: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    category?: ChatV2RoomCategory | null;
};

export type ChatV2Attachment = {
    id: string;
    messageId: string;
    storageProvider: "DO_SPACES" | "S3" | "LOCAL";
    objectKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: string;
    sha256: string;
    isImage: boolean;
    createdAt: string | Date;
};

export type ChatV2CreateAttachment = {
    storageProvider: "DO_SPACES" | "S3" | "LOCAL";
    objectKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: string;
    sha256: string;
    isImage: boolean;
};

export type ChatV2Message = {
    id: string;
    roomId: string;
    senderUserId: number;
    sender?: {
        id: number;
        name: string | null;
        image: string | null;
    };
    clientMessageId: string;
    content: string;
    messageType: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
    replyToMessageId: string | null;
    editedAt: string | Date | null;
    deletedAt: string | Date | null;
    createdAt: string | Date;
    attachments: ChatV2Attachment[];
};

export type ChatV2RoomMember = {
    roomId: string;
    userId: number;
    role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY";
    status: "ACTIVE" | "INVITED" | "REMOVED";
    joinedAt: string | Date;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

export type ChatV2MessageSearchSort = "LATEST" | "OLDEST";

export type ChatV2MessageSearchInput = {
    workspaceId?: string;
    query?: string;
    fromUserId?: number;
    roomId?: string;
    sort?: ChatV2MessageSearchSort;
    limit?: number;
};

export type ChatV2SearchUser = {
    id: number;
    name: string | null;
    image: string | null;
};
