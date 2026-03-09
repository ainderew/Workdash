import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";
import { tokenStore } from "@/common/utils/tokenStore";
import type {
    BannerConfig,
    ChannelOverwrite,
    ChatV2CreateAttachment,
    ChatV2DirectRoom,
    ChatV2Friend,
    ChatV2FriendshipStatus,
    ChatV2FrequentEmoji,
    ChatV2Message,
    ChatV2MessageReaction,
    ChatV2MessageReactionUpdate,
    ChatV2MessageSearchInput,
    ChatV2MessageSearchSort,
    ChatV2PinnedMessage,
    ChatV2ReactionReactorList,
    ChatV2Room,
    ChatV2RoomCategory,
    ChatV2RoomMember,
    ChatV2SearchUser,
    ChatV2Thread,
    ChatV2UserNotification,
    ChatV2UserProfile,
    Workspace,
    WorkspaceInvite,
    WorkspaceMap,
    WorkspaceMember,
    WorkspaceRole,
    DotaRecentMatch,
    DotaStats,
    BetrayalStats,
} from "./_types";
import { getStandaloneGifUrl } from "./gifUrl";
import { usePresenceStore } from "@/common/store/presenceStore";

type AckResponse<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

type RealtimeHandlers = {
    onMessageNew: (message: ChatV2Message) => void;
    onMessageUpdate: (message: ChatV2Message) => void;
    onMessageDelete: (payload: {
        roomId: string;
        messageId: string;
        deletedAt: string | Date | null;
    }) => void;
    onMessageReactionUpdate?: (payload: ChatV2MessageReactionUpdate) => void;
    onNotificationNew?: (notification: ChatV2UserNotification) => void;
    onMessagePinNew?: (pinnedMessage: ChatV2PinnedMessage) => void;
    onMessagePinRemoved?: (payload: { roomId: string; messageId: string }) => void;
};

export class ChatV2Service {
    private static instance: ChatV2Service;

    private transport: MediaTransportService;

    private teardownRealtimeHandlers: (() => void) | null = null;

    constructor() {
        const jwtToken =
            typeof window !== "undefined" ? tokenStore.getJwt() : "";
        this.transport = MediaTransportService.getInstance(jwtToken);
    }

    static getInstance() {
        if (!ChatV2Service.instance) {
            ChatV2Service.instance = new ChatV2Service();
        }
        return ChatV2Service.instance;
    }

    private emitWithAck<T>(
        eventName: string,
        payload?: Record<string, unknown>,
        timeoutMs: number = 10000,
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const doEmit = () => {
                const timeoutId = window.setTimeout(() => {
                    reject(new Error(`${eventName} timed out`));
                }, timeoutMs);

                const onResponse = (response: AckResponse<T>) => {
                    window.clearTimeout(timeoutId);

                    if (!response || typeof response !== "object") {
                        reject(new Error(`Invalid response for ${eventName}`));
                        return;
                    }

                    if (response.ok) {
                        resolve(response.data);
                        return;
                    }

                    reject(new Error(response.error || `Failed: ${eventName}`));
                };

                if (payload === undefined) {
                    this.transport.socket.emit(eventName, onResponse);
                    return;
                }

                this.transport.socket.emit(eventName, payload, onResponse);
            };

            if (this.transport.socket.connected) {
                doEmit();
            } else {
                this.transport.socket.once("connect", doEmit);
            }
        });
    }

    setupRealtimeHandlers(handlers: RealtimeHandlers) {
        if (this.teardownRealtimeHandlers) {
            this.teardownRealtimeHandlers();
        }

        const onMessageNew = (payload: { message: ChatV2Message }) => {
            if (payload?.message) {
                handlers.onMessageNew(payload.message);
            }
        };

        const onMessageUpdate = (payload: { message: ChatV2Message }) => {
            if (payload?.message) {
                handlers.onMessageUpdate(payload.message);
            }
        };

        const onMessageDelete = (payload: {
            roomId: string;
            messageId: string;
            deletedAt: string | Date | null;
        }) => {
            if (payload?.roomId && payload?.messageId) {
                handlers.onMessageDelete(payload);
            }
        };

        const onNotificationNew = (payload: {
            notification: ChatV2UserNotification;
        }) => {
            if (payload?.notification) {
                handlers.onNotificationNew?.(payload.notification);
            }
        };

        const onMessageReactionUpdate = (payload: ChatV2MessageReactionUpdate) => {
            if (payload?.roomId && payload?.messageId && payload?.emoji) {
                handlers.onMessageReactionUpdate?.(payload);
            }
        };

        const onMessagePinNew = (payload: { pinnedMessage: ChatV2PinnedMessage }) => {
            if (payload?.pinnedMessage) {
                handlers.onMessagePinNew?.(payload.pinnedMessage);
            }
        };

        const onMessagePinRemoved = (payload: { roomId: string; messageId: string }) => {
            if (payload?.roomId && payload?.messageId) {
                handlers.onMessagePinRemoved?.(payload);
            }
        };

        this.transport.socket.on("chat:v2:message:new", onMessageNew);
        this.transport.socket.on("chat:v2:message:update", onMessageUpdate);
        this.transport.socket.on("chat:v2:message:delete", onMessageDelete);
        this.transport.socket.on(
            "chat:v2:message:reaction:update",
            onMessageReactionUpdate,
        );
        this.transport.socket.on("chat:v2:notification:new", onNotificationNew);
        this.transport.socket.on("chat:v2:message:pin:new", onMessagePinNew);
        this.transport.socket.on("chat:v2:message:pin:removed", onMessagePinRemoved);

        this.teardownRealtimeHandlers = () => {
            this.transport.socket.off("chat:v2:message:new", onMessageNew);
            this.transport.socket.off("chat:v2:message:update", onMessageUpdate);
            this.transport.socket.off("chat:v2:message:delete", onMessageDelete);
            this.transport.socket.off(
                "chat:v2:message:reaction:update",
                onMessageReactionUpdate,
            );
            this.transport.socket.off("chat:v2:notification:new", onNotificationNew);
            this.transport.socket.off("chat:v2:message:pin:new", onMessagePinNew);
            this.transport.socket.off("chat:v2:message:pin:removed", onMessagePinRemoved);
            this.teardownRealtimeHandlers = null;
        };

        return this.teardownRealtimeHandlers;
    }

    async listRooms(workspaceId?: string): Promise<ChatV2Room[]> {
        const payload = workspaceId ? { workspaceId } : undefined;
        const response = await this.emitWithAck<{ rooms: ChatV2Room[] }>(
            "chat:v2:room:list",
            payload,
        );
        return response.rooms;
    }

    async listCategories(workspaceId?: string): Promise<ChatV2RoomCategory[]> {
        const payload = workspaceId ? { workspaceId } : {};
        const response = await this.emitWithAck<{
            categories: ChatV2RoomCategory[];
        }>("chat:v2:category:list", payload);
        return response.categories;
    }

    async joinRoom(roomId: string): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{ room: ChatV2Room }>(
            "chat:v2:room:join",
            { roomId },
        );
        return response.room;
    }

    async listMessages(
        roomId: string,
        limit: number = 100,
        options?: {
            rootOnly?: boolean;
            includeReplySummary?: boolean;
            before?: string | Date;
        },
    ): Promise<ChatV2Message[]> {
        const payload: {
            roomId: string;
            limit: number;
            rootOnly?: boolean;
            includeReplySummary?: boolean;
            before?: string;
        } = {
            roomId,
            limit,
        };
        if (typeof options?.rootOnly === "boolean") {
            payload.rootOnly = options.rootOnly;
        }
        if (typeof options?.includeReplySummary === "boolean") {
            payload.includeReplySummary = options.includeReplySummary;
        }
        if (options?.before) {
            payload.before =
                options.before instanceof Date
                    ? options.before.toISOString()
                    : options.before;
        }

        const response = await this.emitWithAck<{ messages: ChatV2Message[] }>(
            "chat:v2:message:list",
            payload,
        );
        return response.messages;
    }

    async getThread(
        roomId: string,
        rootMessageId: string,
        options?: {
            before?: string | Date;
            limit?: number;
        },
    ): Promise<ChatV2Thread> {
        const payload: {
            roomId: string;
            rootMessageId: string;
            before?: string;
            limit?: number;
        } = {
            roomId,
            rootMessageId,
        };
        if (options?.before) {
            payload.before =
                options.before instanceof Date
                    ? options.before.toISOString()
                    : options.before;
        }
        if (typeof options?.limit === "number") {
            payload.limit = options.limit;
        }

        const response = await this.emitWithAck<ChatV2Thread>(
            "chat:v2:thread:get",
            payload,
        );

        return response;
    }

    async searchMessages(
        input: ChatV2MessageSearchInput,
    ): Promise<{ messages: ChatV2Message[]; totalCount: number }> {
        const payload: {
            workspaceId?: string;
            query?: string;
            fromUserId?: number;
            roomId?: string;
            sort?: ChatV2MessageSearchSort;
            limit?: number;
        } = {};

        if (input.workspaceId) payload.workspaceId = input.workspaceId;
        if (input.query?.trim()) payload.query = input.query.trim();
        if (input.fromUserId) payload.fromUserId = input.fromUserId;
        if (input.roomId) payload.roomId = input.roomId;
        if (input.sort) payload.sort = input.sort;
        if (input.limit) payload.limit = input.limit;

        const response = await this.emitWithAck<{
            messages: ChatV2Message[];
            totalCount: number;
        }>("chat:v2:message:search", payload);

        return response;
    }

    async searchUsers(input: {
        workspaceId?: string;
        query: string;
        limit?: number;
    }): Promise<ChatV2SearchUser[]> {
        const response = await this.emitWithAck<{ users: ChatV2SearchUser[] }>(
            "chat:v2:user:search",
            {
                workspaceId: input.workspaceId,
                query: input.query.trim(),
                limit: input.limit,
            },
        );
        return response.users;
    }

    async getUserProfile(userId: number): Promise<ChatV2UserProfile> {
        const response = await this.emitWithAck<{ profile: ChatV2UserProfile }>(
            "chat:v2:user:profile:get",
            { userId },
        );
        return response.profile;
    }

    async updateOwnUserProfile(
        input: {
            bio?: string | null;
            banner?: BannerConfig;
        },
    ): Promise<ChatV2UserProfile> {
        const payload: {
            bio?: string | null;
            banner?: BannerConfig;
        } = {};
        if (input.bio !== undefined) payload.bio = input.bio;
        if (input.banner !== undefined) payload.banner = input.banner;

        const response = await this.emitWithAck<{ profile: ChatV2UserProfile }>(
            "chat:v2:user:profile:update",
            payload,
        );
        return response.profile;
    }

    async listFriends(input?: {
        status?: ChatV2FriendshipStatus;
        query?: string;
        limit?: number;
    }): Promise<ChatV2Friend[]> {
        const payload: {
            status?: ChatV2FriendshipStatus;
            query?: string;
            limit?: number;
        } = {};
        if (input?.status) payload.status = input.status;
        if (input?.query?.trim()) payload.query = input.query.trim();
        if (typeof input?.limit === "number") payload.limit = input.limit;

        const response = await this.emitWithAck<{ friends: ChatV2Friend[] }>(
            "chat:v2:friend:list",
            payload,
        );
        return response.friends;
    }

    async listNotifications(input?: {
        unreadOnly?: boolean;
        limit?: number;
    }): Promise<{ notifications: ChatV2UserNotification[]; unreadCount: number }> {
        const payload: {
            unreadOnly?: boolean;
            limit?: number;
        } = {};
        if (typeof input?.unreadOnly === "boolean") {
            payload.unreadOnly = input.unreadOnly;
        }
        if (typeof input?.limit === "number") {
            payload.limit = input.limit;
        }

        return await this.emitWithAck<{
            notifications: ChatV2UserNotification[];
            unreadCount: number;
        }>("chat:v2:notification:list", payload);
    }

    async markNotificationsRead(input?: {
        notificationIds?: string[];
        markAll?: boolean;
    }): Promise<{ markedCount: number; unreadCount: number }> {
        const payload: {
            notificationIds?: string[];
            markAll?: boolean;
        } = {};
        if (Array.isArray(input?.notificationIds)) {
            payload.notificationIds = input.notificationIds;
        }
        if (typeof input?.markAll === "boolean") {
            payload.markAll = input.markAll;
        }

        return await this.emitWithAck<{
            markedCount: number;
            unreadCount: number;
        }>("chat:v2:notification:read", payload);
    }

    async requestFriend(userId: number): Promise<ChatV2Friend> {
        const response = await this.emitWithAck<{ friend: ChatV2Friend }>(
            "chat:v2:friend:request",
            { userId },
        );
        return response.friend;
    }

    async respondToFriendRequest(
        friendshipId: string,
        action: "ACCEPT" | "DECLINE" | "BLOCK",
    ): Promise<ChatV2Friend> {
        const response = await this.emitWithAck<{ friend: ChatV2Friend }>(
            "chat:v2:friend:respond",
            { friendshipId, action },
        );
        return response.friend;
    }

    async removeFriend(friendshipId: string): Promise<void> {
        await this.emitWithAck<{ success: boolean }>("chat:v2:friend:remove", {
            friendshipId,
        });
    }

    async listDirectRooms(): Promise<ChatV2DirectRoom[]> {
        const response = await this.emitWithAck<{
            directRooms: ChatV2DirectRoom[];
        }>("chat:v2:dm:list");
        return response.directRooms;
    }

    async openDirectMessage(targetUserId: number): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{ room: ChatV2Room }>(
            "chat:v2:dm:open",
            { userId: targetUserId },
        );
        return response.room;
    }

    async updateReadCursor(
        roomId: string,
        lastReadMessageId?: string,
    ): Promise<void> {
        const payload: {
            roomId: string;
            lastReadMessageId?: string;
        } = { roomId };
        if (lastReadMessageId) payload.lastReadMessageId = lastReadMessageId;

        await this.emitWithAck<{ readCursor: unknown }>("chat:v2:read:update", payload);
    }

    async toggleMessageReaction(
        roomId: string,
        messageId: string,
        emoji: string,
    ): Promise<{
        message: ChatV2Message;
        action: "ADDED" | "REMOVED";
        reaction: ChatV2MessageReaction | null;
    }> {
        return await this.emitWithAck<{
            message: ChatV2Message;
            action: "ADDED" | "REMOVED";
            reaction: ChatV2MessageReaction | null;
        }>("chat:v2:message:reaction:toggle", {
            roomId,
            messageId,
            emoji,
        });
    }

    async listReactionReactors(
        roomId: string,
        messageId: string,
        emoji: string,
        limit: number = 20,
    ): Promise<ChatV2ReactionReactorList> {
        return await this.emitWithAck<ChatV2ReactionReactorList>(
            "chat:v2:message:reaction:reactors:list",
            {
                roomId,
                messageId,
                emoji,
                limit,
            },
        );
    }

    async listFrequentEmojis(limit: number = 6): Promise<ChatV2FrequentEmoji[]> {
        const response = await this.emitWithAck<{ emojis: ChatV2FrequentEmoji[] }>(
            "chat:v2:emoji:frequent:list",
            { limit },
        );
        return response.emojis;
    }

    async pinMessage(roomId: string, messageId: string): Promise<ChatV2PinnedMessage> {
        const response = await this.emitWithAck<{ pinnedMessage: ChatV2PinnedMessage }>(
            "chat:v2:message:pin",
            { roomId, messageId },
        );
        return response.pinnedMessage;
    }

    async unpinMessage(roomId: string, messageId: string): Promise<void> {
        await this.emitWithAck<{ success: boolean }>(
            "chat:v2:message:unpin",
            { roomId, messageId },
        );
    }

    async listPinnedMessages(roomId: string, limit?: number): Promise<ChatV2PinnedMessage[]> {
        const payload: { roomId: string; limit?: number } = { roomId };
        if (typeof limit === "number") payload.limit = limit;
        const response = await this.emitWithAck<{ pinnedMessages: ChatV2PinnedMessage[] }>(
            "chat:v2:message:pin:list",
            payload,
        );
        return response.pinnedMessages;
    }

    async createMessage(
        roomId: string,
        content: string,
        attachments?: ChatV2CreateAttachment[],
        options?: {
            replyToMessageId?: string;
            mentionedUserIds?: number[];
        },
    ): Promise<ChatV2Message> {
        const clientMessageId =
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const payload: {
            roomId: string;
            clientMessageId: string;
            content: string;
            messageType?: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
            attachments?: ChatV2CreateAttachment[];
            replyToMessageId?: string;
            mentionedUserIds?: number[];
        } = {
            roomId,
            clientMessageId,
            content,
        };
        if (options?.replyToMessageId) {
            payload.replyToMessageId = options.replyToMessageId;
        }
        if (options?.mentionedUserIds?.length) {
            payload.mentionedUserIds = options.mentionedUserIds;
        }
        if (attachments?.length) {
            payload.attachments = attachments;
        } else {
            const standaloneGifUrl = getStandaloneGifUrl(content);
            if (standaloneGifUrl) {
                payload.content = standaloneGifUrl;
                payload.messageType = "IMAGE";
            }
        }

        const response = await this.emitWithAck<{
            message: ChatV2Message;
            deduplicated: boolean;
        }>("chat:v2:message:create", payload);

        return response.message;
    }

    async deleteMessage(
        roomId: string,
        messageId: string,
    ): Promise<{
        messageId: string;
        roomId: string;
        deletedAt: string | Date | null;
    }> {
        return await this.emitWithAck<{
            messageId: string;
            roomId: string;
            deletedAt: string | Date | null;
        }>("chat:v2:message:delete", {
            roomId,
            messageId,
        });
    }

    async createRoom(input: {
        name: string;
        topic?: string;
        categoryId?: string | null;
        visibility?: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
        workspaceId?: string;
    }): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{ room: ChatV2Room }>(
            "chat:v2:room:create",
            input,
        );
        return response.room;
    }

    async updateRoom(roomId: string, name: string): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{ room: ChatV2Room }>(
            "chat:v2:room:update",
            { roomId, name },
        );
        return response.room;
    }

    async deleteRoom(roomId: string): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{ room: ChatV2Room }>(
            "chat:v2:room:delete",
            { roomId },
        );
        return response.room;
    }

    async createCategory(
        name: string,
        workspaceId?: string,
    ): Promise<ChatV2RoomCategory> {
        const payload = workspaceId ? { name, workspaceId } : { name };
        const response = await this.emitWithAck<{
            category: ChatV2RoomCategory;
        }>("chat:v2:category:create", payload);
        return response.category;
    }

    async updateCategory(
        categoryId: string,
        name: string,
    ): Promise<ChatV2RoomCategory> {
        const response = await this.emitWithAck<{
            category: ChatV2RoomCategory;
        }>("chat:v2:category:update", { categoryId, name });
        return response.category;
    }

    async arrangeCategory(
        categoryId: string,
        position: number,
    ): Promise<ChatV2RoomCategory> {
        const response = await this.emitWithAck<{
            category: ChatV2RoomCategory;
        }>("chat:v2:category:arrange", { categoryId, position });
        return response.category;
    }

    async arrangeRoom(
        roomId: string,
        categoryId: string | null,
        position: number,
    ): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{
            room: ChatV2Room;
        }>("chat:v2:room:arrange", {
            roomId,
            categoryId,
            position,
        });
        return response.room;
    }

    async listRoomMembers(roomId: string): Promise<ChatV2RoomMember[]> {
        const response = await this.emitWithAck<{ members: ChatV2RoomMember[] }>(
            "chat:v2:room:member:list",
            { roomId },
        );
        return response.members;
    }

    async addRoomMember(
        roomId: string,
        userId: number,
        role?: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY",
    ): Promise<ChatV2RoomMember[]> {
        const payload: {
            roomId: string;
            userId: number;
            role?: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY";
        } = {
            roomId,
            userId,
        };
        if (role) payload.role = role;

        const response = await this.emitWithAck<{ members: ChatV2RoomMember[] }>(
            "chat:v2:room:member:add",
            payload,
        );
        return response.members;
    }

    async removeRoomMember(
        roomId: string,
        userId: number,
    ): Promise<ChatV2RoomMember[]> {
        const response = await this.emitWithAck<{ members: ChatV2RoomMember[] }>(
            "chat:v2:room:member:remove",
            { roomId, userId },
        );
        return response.members;
    }

    // --- Workspace methods ---

    async listWorkspaces(): Promise<Workspace[]> {
        const response = await this.emitWithAck<{ workspaces: Workspace[] }>(
            "workspace:list",
        );
        return response.workspaces;
    }

    async createWorkspace(input: {
        name: string;
        iconUrl?: string;
    }): Promise<Workspace> {
        const payload: { name: string; iconUrl?: string } = {
            name: input.name,
        };
        if (input.iconUrl !== undefined) {
            payload.iconUrl = input.iconUrl;
        }
        const response = await this.emitWithAck<{ workspace: Workspace }>(
            "workspace:create",
            payload,
        );
        return response.workspace;
    }

    async getWorkspace(workspaceId: string): Promise<Workspace> {
        const response = await this.emitWithAck<{ workspace: Workspace }>(
            "workspace:get",
            { workspaceId },
        );
        return response.workspace;
    }

    async updateWorkspace(input: {
        workspaceId: string;
        name?: string;
        iconUrl?: string | null;
    }): Promise<Workspace> {
        const payload: {
            workspaceId: string;
            name?: string;
            iconUrl?: string | null;
        } = { workspaceId: input.workspaceId };
        if (input.name !== undefined) payload.name = input.name;
        if (input.iconUrl !== undefined) payload.iconUrl = input.iconUrl;

        const response = await this.emitWithAck<{ workspace: Workspace }>(
            "workspace:update",
            payload,
        );
        return response.workspace;
    }

    /** Notify the SFU server which workspace the client is currently viewing.
     *  Sets socketWorkspaces + joins the socket.io workspace room. */
    selectWorkspace(workspaceId: string): void {
        this.transport.socket.emit("workspace:select", { workspaceId }, () => {});
    }

    async joinWorkspace(workspaceId: string): Promise<WorkspaceMember> {
        const response = await this.emitWithAck<{ member: WorkspaceMember }>(
            "workspace:join",
            { workspaceId },
        );
        return response.member;
    }

    async leaveWorkspace(workspaceId: string): Promise<void> {
        await this.emitWithAck<{ success: boolean }>(
            "workspace:leave",
            { workspaceId },
        );
    }

    async createWorkspaceInvite(input: {
        workspaceId: string;
        maxUses?: number;
        expiresInHours?: number;
    }): Promise<WorkspaceInvite> {
        const payload: {
            workspaceId: string;
            maxUses?: number;
            expiresInHours?: number;
        } = { workspaceId: input.workspaceId };
        if (input.maxUses !== undefined) payload.maxUses = input.maxUses;
        if (input.expiresInHours !== undefined) payload.expiresInHours = input.expiresInHours;

        const response = await this.emitWithAck<{ invite: WorkspaceInvite }>(
            "workspace:invite:create",
            payload,
        );
        return response.invite;
    }

    async joinWorkspaceByInvite(code: string): Promise<Workspace> {
        const response = await this.emitWithAck<{ workspace: Workspace }>(
            "workspace:invite:join",
            { code },
        );
        return response.workspace;
    }

    async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
        const response = await this.emitWithAck<{ members: WorkspaceMember[] }>(
            "workspace:member:list",
            { workspaceId },
        );

        // Hydrate presence store from workspace member list
        const presenceEntries = response.members
            .filter((m: WorkspaceMember) => m.presence)
            .map((m: WorkspaceMember) => ({
                userId: m.userId,
                ...m.presence!,
            }));
        if (presenceEntries.length > 0) {
            usePresenceStore.getState().bulkSetPresence(presenceEntries);
        }

        return response.members;
    }

    async kickWorkspaceMember(
        workspaceId: string,
        targetUserId: number,
    ): Promise<void> {
        await this.emitWithAck<{ success: boolean }>(
            "workspace:member:kick",
            { workspaceId, targetUserId },
        );
    }

    async banWorkspaceMember(
        workspaceId: string,
        targetUserId: number,
        reason?: string,
    ): Promise<void> {
        const payload: {
            workspaceId: string;
            targetUserId: number;
            reason?: string;
        } = { workspaceId, targetUserId };
        if (reason !== undefined) payload.reason = reason;

        await this.emitWithAck<{ success: boolean }>(
            "workspace:member:ban",
            payload,
        );
    }

    // --- Workspace Map methods ---

    async listWorkspaceMaps(workspaceId: string): Promise<WorkspaceMap[]> {
        const response = await this.emitWithAck<{ maps: WorkspaceMap[] }>(
            "workspace:map:list",
            { workspaceId },
        );
        return response.maps;
    }

    async getWorkspaceMap(workspaceId: string, mapId: string): Promise<WorkspaceMap> {
        const response = await this.emitWithAck<{ map: WorkspaceMap }>(
            "workspace:map:get",
            { workspaceId, mapId },
        );
        return response.map;
    }

    async getDefaultWorkspaceMap(workspaceId: string): Promise<WorkspaceMap> {
        const response = await this.emitWithAck<{ map: WorkspaceMap }>(
            "workspace:map:default",
            { workspaceId },
        );
        return response.map;
    }

    // --- Workspace Role methods ---

    async listWorkspaceRoles(workspaceId: string): Promise<WorkspaceRole[]> {
        const response = await this.emitWithAck<{ roles: WorkspaceRole[] }>(
            "workspace:role:list",
            { workspaceId },
        );
        return response.roles;
    }

    async createWorkspaceRole(
        workspaceId: string,
        input: {
            name: string;
            permissions: string;
            color?: number;
            isHoisted?: boolean;
            isMentionable?: boolean;
        },
    ): Promise<WorkspaceRole> {
        const payload: {
            workspaceId: string;
            name: string;
            permissions: string;
            color?: number;
            isHoisted?: boolean;
            isMentionable?: boolean;
        } = {
            workspaceId,
            name: input.name,
            permissions: input.permissions,
        };
        if (input.color !== undefined) payload.color = input.color;
        if (input.isHoisted !== undefined) payload.isHoisted = input.isHoisted;
        if (input.isMentionable !== undefined) payload.isMentionable = input.isMentionable;

        const response = await this.emitWithAck<{ role: WorkspaceRole }>(
            "workspace:role:create",
            payload,
        );
        return response.role;
    }

    async updateWorkspaceRole(
        workspaceId: string,
        roleId: string,
        input: {
            name?: string;
            permissions?: string;
            color?: number;
            position?: number;
            isHoisted?: boolean;
            isMentionable?: boolean;
        },
    ): Promise<WorkspaceRole> {
        const payload: {
            workspaceId: string;
            roleId: string;
            name?: string;
            permissions?: string;
            color?: number;
            position?: number;
            isHoisted?: boolean;
            isMentionable?: boolean;
        } = { workspaceId, roleId };
        if (input.name !== undefined) payload.name = input.name;
        if (input.permissions !== undefined) payload.permissions = input.permissions;
        if (input.color !== undefined) payload.color = input.color;
        if (input.position !== undefined) payload.position = input.position;
        if (input.isHoisted !== undefined) payload.isHoisted = input.isHoisted;
        if (input.isMentionable !== undefined) payload.isMentionable = input.isMentionable;

        const response = await this.emitWithAck<{ role: WorkspaceRole }>(
            "workspace:role:update",
            payload,
        );
        return response.role;
    }

    async deleteWorkspaceRole(workspaceId: string, roleId: string): Promise<void> {
        await this.emitWithAck<{ success: boolean }>(
            "workspace:role:delete",
            { workspaceId, roleId },
        );
    }

    async assignWorkspaceRole(
        workspaceId: string,
        userId: number,
        roleId: string,
    ): Promise<void> {
        await this.emitWithAck<{ success: boolean }>(
            "workspace:role:assign",
            { workspaceId, targetUserId: userId, roleId },
        );
    }

    async removeWorkspaceRole(
        workspaceId: string,
        userId: number,
        roleId: string,
    ): Promise<void> {
        await this.emitWithAck<{ success: boolean }>(
            "workspace:role:remove",
            { workspaceId, targetUserId: userId, roleId },
        );
    }

    // --- Channel Overwrite methods ---

    async listChannelOverwrites(
        workspaceId: string,
        channelId: string,
    ): Promise<ChannelOverwrite[]> {
        const response = await this.emitWithAck<{ overwrites: ChannelOverwrite[] }>(
            "workspace:channel:overwrite:list",
            { workspaceId, channelId },
        );
        return response.overwrites;
    }

    async setChannelOverwrite(
        workspaceId: string,
        channelId: string,
        input: {
            targetId: string;
            targetType: 0 | 1;
            allow: string;
            deny: string;
        },
    ): Promise<ChannelOverwrite> {
        const response = await this.emitWithAck<{ overwrite: ChannelOverwrite }>(
            "workspace:channel:overwrite:set",
            {
                workspaceId,
                channelId,
                targetId: input.targetId,
                targetType: input.targetType,
                allow: input.allow,
                deny: input.deny,
            },
        );
        return response.overwrite;
    }

    async deleteChannelOverwrite(
        workspaceId: string,
        channelId: string,
        targetId: string,
        targetType: 0 | 1,
    ): Promise<void> {
        await this.emitWithAck<{ success: boolean }>(
            "workspace:channel:overwrite:delete",
            { workspaceId, channelId, targetId, targetType },
        );
    }

    // --- Dota 2 Profile methods ---

    async linkSteam(steamId64: string): Promise<DotaStats> {
        const response = await this.emitWithAck<{ steamLink: DotaStats }>(
            "dota:link",
            { steamId64 },
        );
        return response.steamLink;
    }

    async unlinkSteam(): Promise<void> {
        await this.emitWithAck<Record<string, never>>(
            "dota:unlink",
        );
    }

    async getDotaStats(userId: number): Promise<DotaStats | null> {
        const response = await this.emitWithAck<{ stats: DotaStats | null }>(
            "dota:stats:get",
            { userId },
        );
        return response.stats;
    }

    async syncDotaStats(): Promise<DotaStats | null> {
        const response = await this.emitWithAck<{ stats: DotaStats | null }>(
            "dota:stats:sync",
        );
        return response.stats;
    }

    async getDotaMatches(userId: number): Promise<DotaRecentMatch[]> {
        const response = await this.emitWithAck<{ matches: DotaRecentMatch[] }>(
            "dota:matches:get",
            { userId },
        );
        return response.matches;
    }

    // ─── Betrayal.io ────────────────────────────────────────────

    async linkBetrayal(friendCode: string): Promise<BetrayalStats> {
        const response = await this.emitWithAck<{ stats: BetrayalStats }>(
            "betrayal:link",
            { friendCode },
        );
        return response.stats;
    }

    async unlinkBetrayal(): Promise<void> {
        await this.emitWithAck<Record<string, never>>(
            "betrayal:unlink",
        );
    }

    async getBetrayalStats(userId: number): Promise<BetrayalStats | null> {
        const response = await this.emitWithAck<{ stats: BetrayalStats | null }>(
            "betrayal:stats:get",
            { userId },
        );
        return response.stats;
    }

    async syncBetrayalStats(): Promise<BetrayalStats | null> {
        const response = await this.emitWithAck<{ stats: BetrayalStats | null }>(
            "betrayal:stats:sync",
        );
        return response.stats;
    }
}
