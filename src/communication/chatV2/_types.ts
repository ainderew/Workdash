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
        imageUrl?: string | null;
        ownerUserId?: number;
    };
    viewerRole?: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY" | null;
    unreadCount?: number;
    categoryId: string | null;
    position: number;
    name: string;
    slug: string;
    topic: string | null;
    visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    type: "TEXT" | "VOICE" | "ANNOUNCEMENT" | "DIRECT";
    isArchived: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    category?: ChatV2RoomCategory | null;
    directRoom?: {
        roomId: string;
        userLowId: number;
        userHighId: number;
        createdByUserId: number;
        createdAt: string | Date;
    } | null;
};

export type ChatV2Attachment = {
    id: string;
    messageId: string;
    storageProvider: "DO_SPACES" | "S3" | "LOCAL" | "GCS";
    objectKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: string;
    sha256: string;
    isImage: boolean;
    createdAt: string | Date;
};

export type ChatV2MessageReaction = {
    emoji: string;
    count: number;
    firstReactedAt: string | Date;
    lastReactedAt: string | Date;
};

export type ChatV2CreateAttachment = {
    id: string;
    storageProvider: "DO_SPACES" | "S3" | "LOCAL" | "GCS";
    objectKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: string;
    sha256: string;
    isImage: boolean;
};

export type ChatV2CharacterCustomization = {
    type: "ADULT" | "KID";
    bodyId: number;
    eyesId: number;
    hairstyleId: number;
    outfitId: number;
    accessoryId?: number;
    itemId?: number;
    itemType?: string;
};

export type ChatV2Message = {
    id: string;
    roomId: string;
    senderUserId: number;
    sender?: {
        id: number;
        name: string | null;
        nickname?: string | null;
        image: string | null;
        bio?: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    };
    clientMessageId: string;
    content: string;
    messageType: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
    replyToMessageId: string | null;
    editedAt: string | Date | null;
    deletedAt: string | Date | null;
    createdAt: string | Date;
    attachments: ChatV2Attachment[];
    replyCount?: number;
    lastReplyAt?: string | Date | null;
    replyPreviewUsers?: Array<{
        id: number;
        name: string | null;
        nickname?: string | null;
        image: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    }>;
    reactions?: ChatV2MessageReaction[];
    mentionedUserIds?: number[];
};

export type ChatV2MessageReactionUpdate = {
    roomId: string;
    messageId: string;
    emoji: string;
    action: "ADDED" | "REMOVED";
    reactorUserId: number;
    count: number;
    firstReactedAt: string | Date | null;
};

export type ChatV2MessageReactionReactor = {
    id: number;
    name: string | null;
    nickname?: string | null;
    image: string | null;
    characterCustomization?: ChatV2CharacterCustomization | null;
};

export type ChatV2ReactionReactorList = {
    emoji: string;
    totalCount: number;
    reactors: ChatV2MessageReactionReactor[];
};

export type ChatV2FrequentEmoji = {
    emoji: string;
    usageCount: number;
    lastUsedAt: string | Date;
};

export type ChatV2Thread = {
    rootMessage: ChatV2Message;
    replies: ChatV2Message[];
    totalReplyCount: number;
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
        nickname?: string | null;
        email: string;
        image?: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
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
    nickname?: string | null;
    image: string | null;
    bio?: string | null;
    characterCustomization?: ChatV2CharacterCustomization | null;
};

export type ChatV2FriendshipStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";

export type ChatV2Friend = {
    friendshipId: string;
    status: ChatV2FriendshipStatus;
    requestedByUserId: number;
    acceptedAt: string | Date | null;
    respondedAt: string | Date | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    peerUser: {
        id: number;
        name: string | null;
        nickname?: string | null;
        email: string;
        image: string | null;
        bio: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    };
};

export type ChatV2DirectRoom = {
    directRoomId: string;
    room: ChatV2Room;
    peerUser: {
        id: number;
        name: string | null;
        nickname?: string | null;
        email: string;
        image: string | null;
        bio: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    };
};

export type ChatV2UserProfile = {
    user: {
        id: number;
        name: string | null;
        nickname?: string | null;
        image: string | null;
        bio: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    };
    isSelf: boolean;
    friendshipStatus: ChatV2FriendshipStatus | null;
    canSendDirectMessage: boolean;
};

export type ChatV2UserNotificationType = "REPLY_TO_MESSAGE" | "MENTION";

export type ChatV2UserNotification = {
    id: string;
    userId: number;
    actorUserId: number;
    type: ChatV2UserNotificationType;
    roomId: string;
    rootMessageId: string;
    replyMessageId: string | null;
    readAt: string | Date | null;
    createdAt: string | Date;
    actorUser: {
        id: number;
        name: string | null;
        nickname?: string | null;
        image: string | null;
        bio: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    };
    room: {
        id: string;
        name: string;
    };
    rootMessage: {
        id: string;
        content: string;
        senderUserId: number;
        createdAt: string | Date;
    };
    replyMessage: {
        id: string;
        content: string;
        senderUserId: number;
        createdAt: string | Date;
    } | null;
};

export type ChatV2PinnedMessage = {
    id: string;
    roomId: string;
    messageId: string;
    pinnedByUserId: number;
    createdAt: string | Date;
    pinnedBy: {
        id: number;
        name: string | null;
        nickname?: string | null;
        image: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    };
    message: ChatV2Message;
};
