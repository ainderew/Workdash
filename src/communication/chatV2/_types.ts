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
    superCount: number;
    firstReactedAt: string | Date;
    lastReactedAt: string | Date;
    viewerReacted?: boolean;
    viewerSuperReacted?: boolean;
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
    botCard?: BotCardPayload;
    replacesMessageId?: string;
};

export type ChatV2MessageReactionUpdate = {
    roomId: string;
    messageId: string;
    emoji: string;
    action: "ADDED" | "REMOVED" | "SUPER_TOGGLED";
    reactorUserId: number;
    count: number;
    superCount: number;
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
        banner?: BannerConfig;
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

// --- Workspace types ---

export type Workspace = {
    id: string;
    name: string;
    iconUrl: string | null;
    ownerId: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    members?: WorkspaceMember[];
    roles?: WorkspaceRole[];
};

export type WorkspaceMember = {
    workspaceId: string;
    userId: number;
    joinedAt: string | Date;
    user?: {
        id: number;
        name: string | null;
        nickname?: string | null;
        email?: string;
        image: string | null;
        characterCustomization?: ChatV2CharacterCustomization | null;
    };
    roles?: WorkspaceRole[];
    presence?: {
        statusId: string;
        label: string;
        color: string;
        icon: string | null;
        manualLock: boolean;
    };
};

export type WorkspaceRole = {
    id: string;
    workspaceId: string;
    name: string;
    permissions: string; // BigInt serialized as string
    color: number;
    position: number;
    isEveryone: boolean;
    isHoisted: boolean;
    isMentionable: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
};

export type WorkspaceInvite = {
    id: string;
    workspaceId: string;
    code: string;
    createdByUserId: number;
    maxUses: number | null;
    uses: number;
    expiresAt: string | Date | null;
    createdAt: string | Date;
};

export type ChannelOverwrite = {
    channelId: string;
    targetId: string;
    targetType: 0 | 1; // 0=role, 1=member
    allow: string; // BigInt as string
    deny: string;
};

export type WorkspaceMap = {
    id: string;
    workspaceId: string;
    mapKey: string;
    label: string | null;
    spawnX: number;
    spawnY: number;
    width: number;
    height: number;
    tilemapUrl: string | null;
    isDefault: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
};

export type BannerConfig =
    | { type: 'solid'; color: string }
    | { type: 'gradient'; gradient: string }
    | { type: 'image'; url: string }
    | null;

export type DotaStats = {
    steamId64: string;
    personaName: string | null;
    rankTier: number | null;
    leaderboardRank: number | null;
    mmrEstimate: number | null;
    isPrivate: boolean;
    lastSyncedAt: string | null;
};

export type DotaRecentMatch = {
    matchId: number;
    heroId: number;
    heroName: string;
    heroIcon: string;
    kills: number;
    deaths: number;
    assists: number;
    duration: number;
    won: boolean;
    gameMode: number;
    startTime: number;
};

// --- Achievement types ---

export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type AchievementCategory = "chat" | "social" | "profile" | "game";

export type AchievementWithStatus = {
    key: string;
    name: string;
    description: string;
    icon: string;
    rarity: AchievementRarity;
    category: AchievementCategory;
    type: "counter" | "one-shot";
    threshold: number;
    hidden: boolean;
    currentCount: number;
    unlockedAt: string | null;
};

export type DisplayAchievement = {
    achievementKey: string;
    position: number;
    name: string;
    description: string;
    icon: string;
    rarity: AchievementRarity;
};

export type AchievementUnlockPayload = {
    userId: number;
    achievementKey: string;
    name: string;
    description: string;
    icon: string;
    rarity: AchievementRarity;
    category: string;
};

// --- Bot card types (structured music bot embeds) ---

export interface BotCardSearching {
    type: "searching";
    query: string;
}

export interface BotCardNowPlaying {
    type: "now_playing";
    track: { title: string; duration: number; source?: string };
    requestedBy: string;
    queueLength: number;
}

export interface BotCardQueued {
    type: "queued";
    track: { title: string; duration: number };
    requestedBy: string;
    position: number;
}

export interface BotCardQueueList {
    type: "queue_list";
    currentTrack: { title: string; state: "playing" | "paused" } | null;
    tracks: Array<{ title: string; duration: number; requestedBy: string }>;
}

export interface BotCardNowPlayingInfo {
    type: "now_playing_info";
    track: { title: string; duration: number; source?: string };
    requestedBy: string;
    state: "playing" | "paused";
    listenerCount: number;
}

export interface BotCardError {
    type: "error";
    message: string;
}

export interface BotCardSessionEnded {
    type: "session_ended";
}

export interface BotCardGenericInfo {
    type: "generic_info";
    message: string;
}

export type BotCardPayload =
    | BotCardSearching
    | BotCardNowPlaying
    | BotCardQueued
    | BotCardQueueList
    | BotCardNowPlayingInfo
    | BotCardError
    | BotCardSessionEnded
    | BotCardGenericInfo;

export type BetrayalStats = {
    friendCode: string;
    betrayerRounds: number;
    betrayerWins: number;
    betrayerWinrate: number;
    crewmateRounds: number;
    crewmateWins: number;
    crewmateWinrate: number;
    lastSyncedAt: string | null;
};
