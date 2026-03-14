import { create } from "zustand";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { EventBus } from "@/game/EventBus";
import type {
    ChatV2CreateAttachment,
    ChatV2DirectRoom,
    ChatV2FrequentEmoji,
    ChatV2Friend,
    ChatV2FriendshipStatus,
    ChatV2Message,
    ChatV2MessageReaction,
    ChatV2MessageReactionReactor,
    ChatV2MessageReactionUpdate,
    ChatV2PinnedMessage,
    ChatV2ReactionReactorList,
    ChatV2Room,
    ChatV2RoomCategory,
    ChatV2RoomMember,
    ChatV2UserNotification,
} from "@/communication/chatV2/_types";
import {
    bumpFrequentEmojiLocal,
    mergeFrequentEmojiSources,
    readFrequentEmojiLocal,
    writeFrequentEmojiLocal,
} from "@/communication/chatV2/reactionFrequentCache";
import { getDisplayName } from "@/common/utils/displayName";
import useUserStore from "@/common/store/useStore";
import { getIsDocumentFocused } from "@/common/hooks/useDocumentFocus";

type MessageDeletePayload = {
    roomId: string;
    messageId: string;
    deletedAt: string | Date | null;
};

type ReactorCacheEntry = {
    emoji: string;
    totalCount: number;
    reactors: ChatV2MessageReactionReactor[];
    fetchedAt: number;
};

type MessageWithReactionAggregates = ChatV2Message & {
    reactionAggregates?: Array<{
        emoji: string;
        count: number;
        superCount?: number;
        firstReactedAt: string | Date;
        lastReactedAt: string | Date;
    }>;
};

const REACTOR_CACHE_TTL_MS = 60_000;
const DEFAULT_FREQUENT_EMOJI_LIMIT = 6;
const toReactorCacheKey = (roomId: string, messageId: string, emoji: string) =>
    `${roomId}:${messageId}:${emoji}`;

const normalizeReactions = (
    reactions: ChatV2MessageReaction[] | undefined,
): ChatV2MessageReaction[] =>
    [...(reactions || [])]
        .filter((entry) => typeof entry?.emoji === "string" && entry.count > 0)
        .sort((a, b) => {
            const aTime = new Date(a.firstReactedAt).getTime();
            const bTime = new Date(b.firstReactedAt).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return a.emoji.localeCompare(b.emoji);
        });

const normalizeMessage = (message: MessageWithReactionAggregates): ChatV2Message => {
    const directReactions = Array.isArray(message.reactions)
        ? message.reactions
        : undefined;
    const fallbackReactions = Array.isArray(message.reactionAggregates)
        ? message.reactionAggregates.map((aggregate) => ({
            emoji: aggregate.emoji,
            count: aggregate.count,
            superCount: aggregate.superCount ?? 0,
            firstReactedAt: aggregate.firstReactedAt,
            lastReactedAt: aggregate.lastReactedAt,
        }))
        : [];

    return {
        ...message,
        reactions: normalizeReactions(directReactions || fallbackReactions),
    };
};

type ChatV2State = {
    initialized: boolean;
    railView: "server" | "dm";
    selectedWorkspaceId: string | null;
    isLoadingRooms: boolean;
    isLoadingDirectRooms: boolean;
    isLoadingFriends: boolean;
    isLoadingFriendRequests: boolean;
    isLoadingNotifications: boolean;
    isLoadingMessages: boolean;
    isLoadingOlderMessages: boolean;
    hasMoreMessagesByRoomId: Record<string, boolean>;
    isSending: boolean;
    isCreatingRoom: boolean;
    isCreatingCategory: boolean;
    isArrangingRooms: boolean;
    isUpdatingRoom: boolean;
    isManagingMembers: boolean;
    error: string | null;
    roomsById: Record<string, ChatV2Room>;
    roomOrder: string[];
    unreadByRoomId: Record<string, number>;
    directRoomsById: Record<string, ChatV2DirectRoom>;
    directRoomOrder: string[];
    frequentEmojis: ChatV2FrequentEmoji[];
    reactionReactorsCache: Record<string, ReactorCacheEntry>;
    friends: ChatV2Friend[];
    friendRequests: ChatV2Friend[];
    notifications: ChatV2UserNotification[];
    categoriesById: Record<string, ChatV2RoomCategory>;
    categoryOrder: string[];
    currentRoomId: string | null;
    messagesByRoomId: Record<string, ChatV2Message[]>;
    membersByRoomId: Record<string, ChatV2RoomMember[]>;
    pinnedMessagesByRoomId: Record<string, ChatV2PinnedMessage[]>;
    isLoadingPinnedMessages: boolean;
    loadPinnedMessages: (roomId: string) => Promise<void>;
    pinMessage: (roomId: string, messageId: string) => Promise<void>;
    unpinMessage: (roomId: string, messageId: string) => Promise<void>;
    setRailView: (view: "server" | "dm") => void;
    setSelectedWorkspaceId: (workspaceId: string | null) => void;
    initialize: () => Promise<void>;
    reloadRoomStructure: () => Promise<void>;
    reloadDirectRooms: () => Promise<void>;
    reloadFriends: (status?: ChatV2FriendshipStatus) => Promise<void>;
    reloadFriendRequests: () => Promise<void>;
    reloadNotifications: (input?: {
        unreadOnly?: boolean;
        limit?: number;
    }) => Promise<void>;
    selectRoom: (roomId: string) => Promise<void>;
    loadOlderMessages: (roomId: string) => Promise<void>;
    sendMessage: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
        options?: {
            replyToMessageId?: string;
            mentionedUserIds?: number[];
        },
    ) => Promise<ChatV2Message | null>;
    toggleMessageReaction: (messageId: string, emoji: string) => Promise<void>;
    superReaction: (messageId: string, emoji: string) => Promise<void>;
    listReactionReactors: (
        roomId: string,
        messageId: string,
        emoji: string,
        options?: {
            force?: boolean;
            limit?: number;
        },
    ) => Promise<ChatV2ReactionReactorList>;
    loadFrequentEmojis: (options?: {
        force?: boolean;
        limit?: number;
    }) => Promise<void>;
    openDirectMessage: (userId: number) => Promise<void>;
    requestFriend: (userId: number) => Promise<void>;
    respondToFriendRequest: (
        friendshipId: string,
        action: "ACCEPT" | "DECLINE" | "BLOCK",
    ) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
    markRoomRead: (roomId: string, lastReadMessageId?: string) => Promise<void>;
    getRoomUnreadCount: (roomId: string) => number;
    getWorkspaceUnreadTotal: (workspaceId: string) => number;
    getDirectUnreadTotal: () => number;
    getIncomingFriendRequestCount: () => number;
    markNotificationsRead: (input?: {
        notificationIds?: string[];
        markAll?: boolean;
    }) => Promise<{ markedCount: number; unreadCount: number }>;
    getUnreadNotificationCount: () => number;
    createRoom: (input: {
        name: string;
        topic?: string;
        categoryId?: string | null;
        visibility?: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    }) => Promise<void>;
    createCategory: (name: string) => Promise<void>;
    arrangeRoom: (
        roomId: string,
        categoryId: string | null,
        position: number,
    ) => Promise<void>;
    arrangeCategory: (categoryId: string, position: number) => Promise<void>;
    renameCategory: (categoryId: string, name: string) => Promise<void>;
    renameRoom: (roomId: string, name: string) => Promise<void>;
    deleteRoom: (roomId: string) => Promise<void>;
    loadRoomMembers: (roomId: string) => Promise<void>;
    addRoomMember: (
        userId: number,
        role?: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY",
    ) => Promise<void>;
    removeRoomMember: (userId: number) => Promise<void>;
    typingUsersByRoomId: Record<string, { userId: number; displayName: string; expiresAt: number }[]>;
    setTypingUser: (roomId: string, userId: number, displayName: string) => void;
    clearTypingUser: (roomId: string, userId: number) => void;
    clear: () => void;
};

const getChatV2Service = () => ChatV2Service.getInstance();

const byCreatedAtAsc = (a: ChatV2Message, b: ChatV2Message) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
};

const byRoomLayout = (a: ChatV2Room, b: ChatV2Room) => {
    const aCategoryPosition = a.category?.position ?? Number.MAX_SAFE_INTEGER;
    const bCategoryPosition = b.category?.position ?? Number.MAX_SAFE_INTEGER;
    if (aCategoryPosition !== bCategoryPosition) {
        return aCategoryPosition - bCategoryPosition;
    }

    const aCategoryId = a.categoryId ?? "";
    const bCategoryId = b.categoryId ?? "";
    if (aCategoryId !== bCategoryId) {
        return aCategoryId.localeCompare(bCategoryId);
    }

    if (a.position !== b.position) {
        return a.position - b.position;
    }

    const aCreatedAt = new Date(a.createdAt).getTime();
    const bCreatedAt = new Date(b.createdAt).getTime();
    if (aCreatedAt !== bCreatedAt) {
        return aCreatedAt - bCreatedAt;
    }

    return a.id.localeCompare(b.id);
};

const byCategoryLayout = (a: ChatV2RoomCategory, b: ChatV2RoomCategory) => {
    if (a.position !== b.position) {
        return a.position - b.position;
    }

    const aCreatedAt = new Date(a.createdAt).getTime();
    const bCreatedAt = new Date(b.createdAt).getTime();
    if (aCreatedAt !== bCreatedAt) {
        return aCreatedAt - bCreatedAt;
    }

    return a.id.localeCompare(b.id);
};

const sortMessages = (messages: ChatV2Message[]) =>
    [...messages].map((message) => normalizeMessage(message)).sort(byCreatedAtAsc);

const toRoomsById = (rooms: ChatV2Room[]) =>
    rooms.reduce<Record<string, ChatV2Room>>((accumulator, room) => {
        accumulator[room.id] = room;
        return accumulator;
    }, {});

const toCategoriesById = (categories: ChatV2RoomCategory[]) =>
    categories.reduce<Record<string, ChatV2RoomCategory>>((accumulator, category) => {
        accumulator[category.id] = category;
        return accumulator;
    }, {});

const toRoomOrder = (rooms: ChatV2Room[]) => [...rooms].sort(byRoomLayout).map((room) => room.id);

const toUnreadByRoomId = (rooms: ChatV2Room[]) =>
    rooms.reduce<Record<string, number>>((accumulator, room) => {
        accumulator[room.id] = room.unreadCount ?? 0;
        return accumulator;
    }, {});

const canUserEnterRoom = (room: ChatV2Room | null | undefined): boolean => {
    if (!room) return false;
    if (room.type === "DIRECT") return true;
    if (room.viewerRole === undefined) return true;
    return room.viewerRole !== null;
};

const toCategoryOrder = (categories: ChatV2RoomCategory[]) =>
    [...categories].sort(byCategoryLayout).map((category) => category.id);

type UpsertMessageResult = {
    messages: ChatV2Message[];
    inserted: boolean;
};

const upsertMessageWithResult = (
    messages: ChatV2Message[],
    nextMessage: ChatV2Message,
): UpsertMessageResult => {
    const normalizedNextMessage = normalizeMessage(nextMessage);
    const existingIndex = messages.findIndex(
        (message) =>
            message.id === normalizedNextMessage.id ||
            message.clientMessageId === normalizedNextMessage.clientMessageId,
    );

    if (existingIndex === -1) {
        return {
            messages: sortMessages([...messages, normalizedNextMessage]),
            inserted: true,
        };
    }

    const updated = [...messages];
    updated[existingIndex] = {
        ...updated[existingIndex],
        ...normalizedNextMessage,
        reactions: normalizeReactions(normalizedNextMessage.reactions),
    };

    return {
        messages: sortMessages(updated),
        inserted: false,
    };
};

const upsertMessage = (
    messages: ChatV2Message[],
    nextMessage: ChatV2Message,
): ChatV2Message[] => upsertMessageWithResult(messages, nextMessage).messages;

const applyReplySummaryInsert = (
    messages: ChatV2Message[],
    replyMessage: ChatV2Message,
): ChatV2Message[] => {
    const rootMessageId = replyMessage.replyToMessageId;
    if (!rootMessageId) {
        return messages;
    }

    const rootMessageIndex = messages.findIndex(
        (message) => message.id === rootMessageId && !message.replyToMessageId,
    );
    if (rootMessageIndex === -1) {
        return messages;
    }

    const rootMessage = messages[rootMessageIndex];
    const replyPreviewSender = {
        id: replyMessage.senderUserId,
        name: getDisplayName(
            replyMessage.sender,
            `User ${replyMessage.senderUserId}`,
        ),
        image: replyMessage.sender?.image || null,
        characterCustomization:
            replyMessage.sender?.characterCustomization ?? undefined,
    };
    const nextReplyPreviewUsers = [
        replyPreviewSender,
        ...(rootMessage.replyPreviewUsers || []).filter(
            (entry) => entry.id !== replyPreviewSender.id,
        ),
    ].slice(0, 3);

    const nextMessages = [...messages];
    nextMessages[rootMessageIndex] = {
        ...rootMessage,
        replyCount: Math.max(0, rootMessage.replyCount ?? 0) + 1,
        lastReplyAt: replyMessage.createdAt,
        replyPreviewUsers: nextReplyPreviewUsers,
    };

    return sortMessages(nextMessages);
};

const applyMessageDelete = (
    messages: ChatV2Message[],
    payload: MessageDeletePayload,
): ChatV2Message[] => {
    const existingIndex = messages.findIndex(
        (message) => message.id === payload.messageId,
    );

    if (existingIndex === -1) {
        return messages;
    }

    const updated = [...messages];
    updated[existingIndex] = {
        ...updated[existingIndex],
        deletedAt: payload.deletedAt,
        content: "",
    };
    return updated;
};

const applyReactionUpdate = (
    messages: ChatV2Message[],
    payload: ChatV2MessageReactionUpdate,
) => {
    const messageIndex = messages.findIndex(
        (message) => message.id === payload.messageId,
    );
    if (messageIndex === -1) {
        return messages;
    }

    const targetMessage = normalizeMessage(messages[messageIndex]);
    const existingReactions = normalizeReactions(targetMessage.reactions);
    const reactionIndex = existingReactions.findIndex(
        (reaction) => reaction.emoji === payload.emoji,
    );

    let nextReactions = [...existingReactions];
    if (payload.count <= 0) {
        if (reactionIndex !== -1) {
            nextReactions.splice(reactionIndex, 1);
        }
    } else {
        const firstReactedAt =
            payload.firstReactedAt ||
            existingReactions[reactionIndex]?.firstReactedAt ||
            new Date().toISOString();
        const lastReactedAt = new Date().toISOString();
        const nextReaction: Pick<ChatV2MessageReaction, 'emoji' | 'count' | 'superCount' | 'firstReactedAt' | 'lastReactedAt'> = {
            emoji: payload.emoji,
            count: payload.count,
            superCount: payload.superCount ?? 0,
            firstReactedAt,
            lastReactedAt,
        };
        if (reactionIndex === -1) {
            nextReactions.push(nextReaction);
        } else {
            nextReactions[reactionIndex] = {
                ...nextReactions[reactionIndex],
                ...nextReaction,
            };
        }
    }

    nextReactions = normalizeReactions(nextReactions);

    const nextMessages = [...messages];
    nextMessages[messageIndex] = {
        ...targetMessage,
        reactions: nextReactions,
    };

    return nextMessages;
};

const sortNotifications = (notifications: ChatV2UserNotification[]) =>
    [...notifications].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        if (aTime !== bTime) return bTime - aTime;
        return a.id.localeCompare(b.id);
    });

const upsertNotification = (
    notifications: ChatV2UserNotification[],
    notification: ChatV2UserNotification,
) => {
    const index = notifications.findIndex((entry) => entry.id === notification.id);
    if (index === -1) {
        return sortNotifications([notification, ...notifications]);
    }

    const next = [...notifications];
    next[index] = {
        ...next[index],
        ...notification,
    };
    return sortNotifications(next);
};

const useChatV2Store = create<ChatV2State>((set, get) => ({
    initialized: false,
    railView: "server",
    selectedWorkspaceId: null,
    isLoadingRooms: false,
    isLoadingDirectRooms: false,
    isLoadingFriends: false,
    isLoadingFriendRequests: false,
    isLoadingNotifications: false,
    isLoadingMessages: false,
    isLoadingOlderMessages: false,
    hasMoreMessagesByRoomId: {},
    isSending: false,
    isCreatingRoom: false,
    isCreatingCategory: false,
    isArrangingRooms: false,
    isUpdatingRoom: false,
    isManagingMembers: false,
    error: null,
    roomsById: {},
    roomOrder: [],
    unreadByRoomId: {},
    directRoomsById: {},
    directRoomOrder: [],
    frequentEmojis: [],
    reactionReactorsCache: {},
    friends: [],
    friendRequests: [],
    notifications: [],
    categoriesById: {},
    categoryOrder: [],
    currentRoomId: null,
    messagesByRoomId: {},
    membersByRoomId: {},
    pinnedMessagesByRoomId: {},
    isLoadingPinnedMessages: false,
    typingUsersByRoomId: {},

    setRailView: (view) => {
        set({ railView: view });
    },

    setSelectedWorkspaceId: (workspaceId) => {
        set({ selectedWorkspaceId: workspaceId });
        if (workspaceId) {
            const chatV2Service = getChatV2Service();
            // Notify SFU server so socketWorkspaces is set for mediasoup isolation
            chatV2Service.selectWorkspace(workspaceId).then(() => {
                EventBus.emit('workspace-select-complete', { workspaceId });
            });
            chatV2Service.listCategories(workspaceId).then((categories) => {
                set({
                    categoriesById: toCategoriesById(categories),
                    categoryOrder: toCategoryOrder(categories),
                });
            }).catch(() => {});
        }
    },

    initialize: async () => {
        if (get().initialized) return;

        set({ isLoadingRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            chatV2Service.setupRealtimeHandlers({
                onMessageNew: (message) => {
                    get().clearTypingUser(message.roomId, message.senderUserId);
                    set((state) => {
                        const currentMessages =
                            state.messagesByRoomId[message.roomId] || [];
                        const upsertResult = upsertMessageWithResult(
                            currentMessages,
                            message,
                        );
                        const nextMessages =
                            upsertResult.inserted && !!message.replyToMessageId
                                ? applyReplySummaryInsert(
                                    upsertResult.messages,
                                    message,
                                )
                                : upsertResult.messages;

                        return {
                            unreadByRoomId: {
                                ...state.unreadByRoomId,
                                [message.roomId]: (() => {
                                    const localUserId =
                                        useUserStore.getState().backendUser?.id;
                                    const isOwnMessage =
                                        typeof localUserId === "number"
                                        && localUserId === message.senderUserId;
                                    if (isOwnMessage || (state.currentRoomId === message.roomId && getIsDocumentFocused())) {
                                        return state.unreadByRoomId[message.roomId] ?? 0;
                                    }

                                    const previousCount =
                                        state.unreadByRoomId[message.roomId]
                                        ?? state.roomsById[message.roomId]?.unreadCount
                                        ?? 0;
                                    return previousCount + 1;
                                })(),
                            },
                            messagesByRoomId: {
                                ...state.messagesByRoomId,
                                [message.roomId]: nextMessages,
                            },
                        };
                    });
                },
                onMessageUpdate: (message) => {
                    set((state) => ({
                        messagesByRoomId: {
                            ...state.messagesByRoomId,
                            [message.roomId]: upsertMessage(
                                state.messagesByRoomId[message.roomId] || [],
                                message,
                            ),
                        },
                    }));
                },
                onMessageDelete: (payload) => {
                    set((state) => ({
                        messagesByRoomId: {
                            ...state.messagesByRoomId,
                            [payload.roomId]: applyMessageDelete(
                                state.messagesByRoomId[payload.roomId] || [],
                                payload,
                            ),
                        },
                    }));
                },
                onMessageReactionUpdate: (payload) => {
                    set((state) => {
                        const roomMessages = state.messagesByRoomId[payload.roomId] || [];
                        const nextRoomMessages = applyReactionUpdate(
                            roomMessages,
                            payload,
                        );
                        if (nextRoomMessages === roomMessages) {
                            return {};
                        }

                        const nextCache = { ...state.reactionReactorsCache };
                        delete nextCache[
                            toReactorCacheKey(
                                payload.roomId,
                                payload.messageId,
                                payload.emoji,
                            )
                        ];

                        return {
                            reactionReactorsCache: nextCache,
                            messagesByRoomId: {
                                ...state.messagesByRoomId,
                                [payload.roomId]: nextRoomMessages,
                            },
                        };
                    });
                },
                onSuperReactionUpdate: (payload) => {
                    set((state) => {
                        const roomMessages = state.messagesByRoomId[payload.roomId] || [];
                        const nextRoomMessages = applyReactionUpdate(
                            roomMessages,
                            payload,
                        );
                        if (nextRoomMessages === roomMessages) {
                            return {};
                        }

                        const nextCache = { ...state.reactionReactorsCache };
                        delete nextCache[
                            toReactorCacheKey(
                                payload.roomId,
                                payload.messageId,
                                payload.emoji,
                            )
                        ];

                        return {
                            reactionReactorsCache: nextCache,
                            messagesByRoomId: {
                                ...state.messagesByRoomId,
                                [payload.roomId]: nextRoomMessages,
                            },
                        };
                    });
                },
                onNotificationNew: (notification) => {
                    set((state) => ({
                        notifications: upsertNotification(
                            state.notifications,
                            notification,
                        ),
                    }));
                },
                onMessagePinNew: (pinnedMessage) => {
                    set((state) => {
                        const current = state.pinnedMessagesByRoomId[pinnedMessage.roomId] || [];
                        const exists = current.some((p) => p.id === pinnedMessage.id);
                        if (exists) return {};
                        return {
                            pinnedMessagesByRoomId: {
                                ...state.pinnedMessagesByRoomId,
                                [pinnedMessage.roomId]: [pinnedMessage, ...current],
                            },
                        };
                    });
                },
                onMessagePinRemoved: (payload) => {
                    set((state) => {
                        const current = state.pinnedMessagesByRoomId[payload.roomId] || [];
                        return {
                            pinnedMessagesByRoomId: {
                                ...state.pinnedMessagesByRoomId,
                                [payload.roomId]: current.filter(
                                    (p) => p.messageId !== payload.messageId,
                                ),
                            },
                        };
                    });
                },
                onTypingUpdate: (payload) => {
                    get().setTypingUser(payload.roomId, payload.userId, payload.displayName);
                },
                onTypingStop: (payload) => {
                    get().clearTypingUser(payload.roomId, payload.userId);
                },
                onAchievementUnlocked: (payload) => {
                    // Handled by useAchievementListener hook for toast/sound
                    // This callback exists so the socket listener is registered
                    EventBus.emit("achievement:unlocked", payload);
                },
            });

            await get().reloadRoomStructure();

            const currentRoomId = get().currentRoomId;
            await Promise.all([
                currentRoomId ? get().selectRoom(currentRoomId) : Promise.resolve(),
                get().reloadDirectRooms(),
                get().reloadFriends("ACCEPTED"),
                get().reloadFriendRequests(),
                get().reloadNotifications({ limit: 100 }),
                get().loadFrequentEmojis({ force: true }),
            ]);

            set({ initialized: true });
        } catch (error) {
            set({
                isLoadingRooms: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to initialize Desk chat",
            });
        }
    },

    reloadRoomStructure: async () => {
        set({ isLoadingRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const wsId = get().selectedWorkspaceId ?? undefined;

            if (!wsId) {
                // No workspace selected — workspace selector overlay will handle it
                set({ isLoadingRooms: false });
                return;
            }

            const rooms = await chatV2Service.listRooms(wsId);

            const roomsById = toRoomsById(rooms);
            const roomOrder = toRoomOrder(rooms);
            const unreadByRoomId = toUnreadByRoomId(rooms);

            const resolvedWsId = wsId;

            // Fetch categories for the resolved workspace
            const categories = resolvedWsId
                ? await chatV2Service.listCategories(resolvedWsId)
                : [];

            const categoriesById = toCategoriesById(categories);
            const categoryOrder = toCategoryOrder(categories);

            // Notify SFU server so socketWorkspaces is set for mediasoup isolation
            if (resolvedWsId) {
                await chatV2Service.selectWorkspace(resolvedWsId);
                EventBus.emit('workspace-select-complete', { workspaceId: resolvedWsId });
            }

            set((state) => {
                const hasCurrentRoom =
                    state.currentRoomId
                    && canUserEnterRoom(roomsById[state.currentRoomId]);
                const firstSelectableRoom = roomOrder
                    .map((roomId) => roomsById[roomId])
                    .find((room) => canUserEnterRoom(room));

                return {
                    isLoadingRooms: false,
                    roomsById,
                    roomOrder,
                    unreadByRoomId: {
                        ...unreadByRoomId,
                        ...state.unreadByRoomId,
                    },
                    categoriesById,
                    categoryOrder,
                    currentRoomId: hasCurrentRoom
                        ? state.currentRoomId
                        : (firstSelectableRoom?.id ?? null),
                    selectedWorkspaceId: resolvedWsId ?? null,
                };
            });
        } catch (error) {
            set({
                isLoadingRooms: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load room structure",
            });
            throw error;
        }
    },

    reloadDirectRooms: async () => {
        set({ isLoadingDirectRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const directRooms = await chatV2Service.listDirectRooms();
            const directRoomsById = directRooms.reduce<Record<string, ChatV2DirectRoom>>(
                (accumulator, entry) => {
                    accumulator[entry.directRoomId] = entry;
                    return accumulator;
                },
                {},
            );
            const directRoomOrder = [...directRooms]
                .sort((a, b) => {
                    const aTime = new Date(a.room.updatedAt).getTime();
                    const bTime = new Date(b.room.updatedAt).getTime();
                    if (aTime !== bTime) return bTime - aTime;
                    return a.directRoomId.localeCompare(b.directRoomId);
                })
                .map((entry) => entry.directRoomId);
            const unreadByRoomId = directRooms.reduce<Record<string, number>>(
                (accumulator, entry) => {
                    accumulator[entry.room.id] = entry.room.unreadCount ?? 0;
                    return accumulator;
                },
                {},
            );

            set((state) => {
                const nextRoomsById = { ...state.roomsById };
                const nextRoomOrder = [...state.roomOrder];
                for (const entry of directRooms) {
                    nextRoomsById[entry.room.id] = {
                        ...nextRoomsById[entry.room.id],
                        ...entry.room,
                    };
                    if (!nextRoomOrder.includes(entry.room.id)) {
                        nextRoomOrder.push(entry.room.id);
                    }
                }

                return {
                    isLoadingDirectRooms: false,
                    directRoomsById,
                    directRoomOrder,
                    roomsById: nextRoomsById,
                    roomOrder: nextRoomOrder,
                    unreadByRoomId: {
                        ...unreadByRoomId,
                        ...state.unreadByRoomId,
                    },
                };
            });
        } catch (error) {
            set({
                isLoadingDirectRooms: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load direct message rooms",
            });
        }
    },

    reloadFriends: async (status = "ACCEPTED") => {
        set({ isLoadingFriends: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const friends = await chatV2Service.listFriends({ status });
            set({
                isLoadingFriends: false,
                friends,
            });
        } catch (error) {
            set({
                isLoadingFriends: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load friends",
            });
        }
    },

    reloadFriendRequests: async () => {
        set({ isLoadingFriendRequests: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const friendRequests = await chatV2Service.listFriends({
                status: "PENDING",
                limit: 100,
            });
            set({
                isLoadingFriendRequests: false,
                friendRequests,
            });
        } catch (error) {
            set({
                isLoadingFriendRequests: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load friend requests",
            });
        }
    },

    reloadNotifications: async (input) => {
        set({ isLoadingNotifications: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const response = await chatV2Service.listNotifications({
                unreadOnly: input?.unreadOnly,
                limit: input?.limit,
            });
            set({
                isLoadingNotifications: false,
                notifications: sortNotifications(response.notifications),
            });
        } catch (error) {
            set({
                isLoadingNotifications: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load notifications",
            });
        }
    },

    selectRoom: async (roomId) => {
        if (!roomId) return;

        const room = get().roomsById[roomId];
        if (room && !canUserEnterRoom(room)) {
            set({
                isLoadingMessages: false,
                error: "You are not a member of this channel.",
            });
            return;
        }

        set({
            currentRoomId: roomId,
            isLoadingMessages: true,
            isLoadingOlderMessages: false,
            error: null,
            railView: room?.type === "DIRECT" ? "dm" : "server",
            selectedWorkspaceId:
                room && room.type !== "DIRECT"
                    ? room.workspaceId
                    : get().selectedWorkspaceId,
        });

        try {
            const PAGE_SIZE = 35;
            const chatV2Service = getChatV2Service();
            const [, messages] = await Promise.all([
                chatV2Service.joinRoom(roomId),
                chatV2Service.listMessages(roomId, PAGE_SIZE, {
                    rootOnly: true,
                    includeReplySummary: true,
                }),
            ]);
            const sortedMessages = sortMessages(messages);
            const lastMessageId = sortedMessages[sortedMessages.length - 1]?.id;

            set((state) => ({
                isLoadingMessages: false,
                unreadByRoomId: {
                    ...state.unreadByRoomId,
                    [roomId]: 0,
                },
                messagesByRoomId: {
                    ...state.messagesByRoomId,
                    [roomId]: sortedMessages,
                },
                hasMoreMessagesByRoomId: {
                    ...state.hasMoreMessagesByRoomId,
                    [roomId]: messages.length >= PAGE_SIZE,
                },
            }));

            void Promise.all([
                get().loadRoomMembers(roomId),
                get().markRoomRead(roomId, lastMessageId),
                get().loadPinnedMessages(roomId),
            ]);
        } catch (error) {
            set({
                isLoadingMessages: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load room messages",
            });
        }
    },

    loadOlderMessages: async (roomId) => {
        const PAGE_SIZE = 35;
        const { isLoadingOlderMessages, hasMoreMessagesByRoomId, messagesByRoomId } = get();
        if (isLoadingOlderMessages || hasMoreMessagesByRoomId[roomId] === false) return;

        const existingMessages = messagesByRoomId[roomId] || [];
        if (existingMessages.length === 0) return;

        const oldestMessage = existingMessages[0];
        if (!oldestMessage) return;

        set({ isLoadingOlderMessages: true });

        try {
            const chatV2Service = getChatV2Service();
            const olderMessages = await chatV2Service.listMessages(
                roomId,
                PAGE_SIZE,
                {
                    rootOnly: true,
                    includeReplySummary: true,
                    before: oldestMessage.createdAt,
                },
            );
            const sortedOlder = sortMessages(olderMessages);

            const existingIds = new Set(
                (get().messagesByRoomId[roomId] || []).map((m) => m.id),
            );
            const dedupedOlder = sortedOlder.filter(
                (m) => !existingIds.has(m.id),
            );

            set((state) => ({
                isLoadingOlderMessages: false,
                messagesByRoomId: {
                    ...state.messagesByRoomId,
                    [roomId]: [...dedupedOlder, ...(state.messagesByRoomId[roomId] || [])],
                },
                hasMoreMessagesByRoomId: {
                    ...state.hasMoreMessagesByRoomId,
                    [roomId]: olderMessages.length >= PAGE_SIZE,
                },
            }));
        } catch {
            set({ isLoadingOlderMessages: false });
        }
    },

    sendMessage: async (content, attachments, options) => {
        const trimmed = content.trim();
        if (!trimmed && !attachments?.length) return null;

        const roomId = get().currentRoomId;
        if (!roomId) return null;
        const replyToMessageId = options?.replyToMessageId?.trim() || undefined;
        const mentionedUserIds = options?.mentionedUserIds?.length
            ? options.mentionedUserIds
            : undefined;

        set({ isSending: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const message = await chatV2Service.createMessage(
                roomId,
                trimmed,
                attachments,
                {
                    replyToMessageId,
                    mentionedUserIds,
                },
            );

            // Ephemeral slash commands return null — skip store update
            if (!message) {
                set({ isSending: false });
                return null;
            }

            set((state) => {
                const currentMessages = state.messagesByRoomId[roomId] || [];
                const upsertResult = upsertMessageWithResult(
                    currentMessages,
                    message,
                );
                const nextMessages =
                    upsertResult.inserted && !!message.replyToMessageId
                        ? applyReplySummaryInsert(upsertResult.messages, message)
                        : upsertResult.messages;

                return {
                    isSending: false,
                    unreadByRoomId: {
                        ...state.unreadByRoomId,
                        [roomId]: 0,
                    },
                    messagesByRoomId: {
                        ...state.messagesByRoomId,
                        [roomId]: nextMessages,
                    },
                };
            });
            await get().markRoomRead(roomId, message.id);
            return message;
        } catch (error) {
            set({
                isSending: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to send message",
            });
            return null;
        }
    },

    toggleMessageReaction: async (messageId, emoji) => {
        const roomId = get().currentRoomId;
        const trimmedEmoji = emoji.trim();
        if (!roomId || !messageId || !trimmedEmoji) return;

        try {
            const chatV2Service = getChatV2Service();
            const result = await chatV2Service.toggleMessageReaction(
                roomId,
                messageId,
                trimmedEmoji,
            );

            const localUserId =
                useUserStore.getState().backendUser?.id;
            const reactionPayload: ChatV2MessageReactionUpdate = {
                roomId,
                messageId,
                emoji: trimmedEmoji,
                action: result.action,
                reactorUserId: localUserId || 0,
                count: result.reaction?.count ?? 0,
                superCount: result.reaction?.superCount ?? 0,
                firstReactedAt: result.reaction?.firstReactedAt ?? null,
            };

            set((state) => {
                const roomMessages = state.messagesByRoomId[roomId] || [];
                const nextRoomMessages = applyReactionUpdate(
                    roomMessages,
                    reactionPayload,
                );
                const nextCache = { ...state.reactionReactorsCache };
                delete nextCache[toReactorCacheKey(roomId, messageId, trimmedEmoji)];

                if (result.action === "REMOVED") {
                    const msgIdx = nextRoomMessages.findIndex((m) => m.id === messageId);
                    if (msgIdx !== -1) {
                        const msg = nextRoomMessages[msgIdx];
                        const reactions = [...(msg.reactions || [])];
                        const rIdx = reactions.findIndex((r) => r.emoji === trimmedEmoji);
                        if (rIdx !== -1) {
                            reactions[rIdx] = {
                                ...reactions[rIdx],
                                viewerSuperReacted: false,
                            };
                            nextRoomMessages[msgIdx] = { ...msg, reactions };
                        }
                    }
                }

                let nextFrequentEmojis = state.frequentEmojis;
                if (
                    result.action === "ADDED" &&
                    typeof localUserId === "number" &&
                    localUserId > 0
                ) {
                    const nextLocal = bumpFrequentEmojiLocal(localUserId, trimmedEmoji);
                    nextFrequentEmojis = nextLocal
                        .slice(0, DEFAULT_FREQUENT_EMOJI_LIMIT)
                        .map((entry) => ({
                            emoji: entry.emoji,
                            usageCount: entry.usageCount,
                            lastUsedAt: entry.lastUsedAt,
                        }));
                }

                return {
                    frequentEmojis: nextFrequentEmojis,
                    reactionReactorsCache: nextCache,
                    messagesByRoomId: {
                        ...state.messagesByRoomId,
                        [roomId]: nextRoomMessages,
                    },
                };
            });
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to toggle reaction",
            });
        }
    },

    superReaction: async (messageId, emoji) => {
        const roomId = get().currentRoomId;
        const trimmedEmoji = emoji.trim();
        if (!roomId || !messageId || !trimmedEmoji) return;

        try {
            const chatV2Service = getChatV2Service();
            const result = await chatV2Service.superReaction(
                roomId,
                messageId,
                trimmedEmoji,
            );

            const localUserId =
                useUserStore.getState().backendUser?.id;
            const reactionPayload: ChatV2MessageReactionUpdate = {
                roomId,
                messageId,
                emoji: trimmedEmoji,
                action: "SUPER_TOGGLED",
                reactorUserId: localUserId || 0,
                count: result.reaction?.count ?? 0,
                superCount: result.reaction?.superCount ?? 0,
                firstReactedAt: result.reaction?.firstReactedAt ?? null,
            };

            set((state) => {
                const roomMessages = state.messagesByRoomId[roomId] || [];
                const nextRoomMessages = applyReactionUpdate(
                    roomMessages,
                    reactionPayload,
                );
                const nextCache = { ...state.reactionReactorsCache };
                delete nextCache[toReactorCacheKey(roomId, messageId, trimmedEmoji)];

                const messageIndex = nextRoomMessages.findIndex(
                    (m) => m.id === messageId,
                );
                if (messageIndex !== -1 && result.reaction) {
                    const msg = nextRoomMessages[messageIndex];
                    const reactions = [...(msg.reactions || [])];
                    const reactionIdx = reactions.findIndex(
                        (r) => r.emoji === trimmedEmoji,
                    );
                    if (reactionIdx !== -1) {
                        reactions[reactionIdx] = {
                            ...reactions[reactionIdx],
                            viewerSuperReacted: result.reaction.viewerSuperReacted,
                        };
                        nextRoomMessages[messageIndex] = {
                            ...msg,
                            reactions,
                        };
                    }
                }

                return {
                    reactionReactorsCache: nextCache,
                    messagesByRoomId: {
                        ...state.messagesByRoomId,
                        [roomId]: nextRoomMessages,
                    },
                };
            });
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to super react",
            });
        }
    },

    listReactionReactors: async (roomId, messageId, emoji, options) => {
        const limit = Math.min(20, Math.max(1, options?.limit ?? 20));
        const cacheKey = toReactorCacheKey(roomId, messageId, emoji);
        const cached = get().reactionReactorsCache[cacheKey];
        const now = Date.now();
        if (
            cached &&
            !options?.force &&
            now - cached.fetchedAt < REACTOR_CACHE_TTL_MS
        ) {
            return {
                emoji: cached.emoji,
                totalCount: cached.totalCount,
                reactors: cached.reactors,
            };
        }

        const chatV2Service = getChatV2Service();
        const result = await chatV2Service.listReactionReactors(
            roomId,
            messageId,
            emoji,
            limit,
        );

        set((state) => ({
            reactionReactorsCache: {
                ...state.reactionReactorsCache,
                [cacheKey]: {
                    emoji: result.emoji,
                    totalCount: result.totalCount,
                    reactors: result.reactors,
                    fetchedAt: Date.now(),
                },
            },
        }));

        return result;
    },

    loadFrequentEmojis: async (options) => {
        const userId =
            useUserStore.getState().backendUser?.id;
        if (typeof userId !== "number" || userId <= 0) {
            return;
        }

        const limit = Math.min(20, Math.max(1, options?.limit ?? DEFAULT_FREQUENT_EMOJI_LIMIT));
        const localEntries = readFrequentEmojiLocal(userId);
        if (localEntries.length > 0 && !options?.force) {
            set({
                frequentEmojis: localEntries.slice(0, limit).map((entry) => ({
                    emoji: entry.emoji,
                    usageCount: entry.usageCount,
                    lastUsedAt: entry.lastUsedAt,
                })),
            });
        }

        try {
            const chatV2Service = getChatV2Service();
            const serverEntries = await chatV2Service.listFrequentEmojis(limit);
            const merged = mergeFrequentEmojiSources(
                localEntries,
                serverEntries,
                limit,
            );
            writeFrequentEmojiLocal(userId, merged);
            set({
                frequentEmojis: merged.map((entry) => ({
                    emoji: entry.emoji,
                    usageCount: entry.usageCount,
                    lastUsedAt: entry.lastUsedAt,
                })),
            });
        } catch (error) {
            if (localEntries.length === 0) {
                set({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load frequent emojis",
                });
            }
        }
    },

    openDirectMessage: async (userId) => {
        if (!Number.isInteger(userId) || userId <= 0) return;

        set({ isLoadingDirectRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const room = await chatV2Service.openDirectMessage(userId);
            await get().reloadRoomStructure();
            await get().reloadDirectRooms();
            await get().selectRoom(room.id);
            set({ isLoadingDirectRooms: false, railView: "dm" });
        } catch (error) {
            set({
                isLoadingDirectRooms: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to open direct message",
            });
        }
    },

    requestFriend: async (userId) => {
        if (!Number.isInteger(userId) || userId <= 0) return;

        set({ isLoadingFriends: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.requestFriend(userId);
            await get().reloadFriends();
            await get().reloadFriendRequests();
            set({ isLoadingFriends: false });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to request friend";
            set({
                isLoadingFriends: false,
                error: message,
            });
            throw new Error(message);
        }
    },

    respondToFriendRequest: async (friendshipId, action) => {
        if (!friendshipId) return;

        set({ isLoadingFriends: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.respondToFriendRequest(friendshipId, action);
            await get().reloadFriends();
            await get().reloadFriendRequests();
            set({ isLoadingFriends: false });
        } catch (error) {
            set({
                isLoadingFriends: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to respond to friend request",
            });
        }
    },

    removeFriend: async (friendshipId) => {
        if (!friendshipId) return;

        set({ isLoadingFriends: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.removeFriend(friendshipId);
            await get().reloadFriends();
            await get().reloadFriendRequests();
            set({ isLoadingFriends: false });
        } catch (error) {
            set({
                isLoadingFriends: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to remove friend",
            });
        }
    },

    markRoomRead: async (roomId, lastReadMessageId) => {
        if (!roomId) return;

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.updateReadCursor(roomId, lastReadMessageId);
            set((state) => ({
                unreadByRoomId: {
                    ...state.unreadByRoomId,
                    [roomId]: 0,
                },
            }));
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to update read cursor",
            });
        }
    },

    getRoomUnreadCount: (roomId) => {
        return get().unreadByRoomId[roomId] ?? 0;
    },

    getWorkspaceUnreadTotal: (workspaceId) => {
        if (!workspaceId) return 0;

        const state = get();
        return Object.values(state.roomsById).reduce((total, room) => {
            if (room.type === "DIRECT") return total;
            if (room.workspaceId !== workspaceId) return total;
            return total + (state.unreadByRoomId[room.id] ?? room.unreadCount ?? 0);
        }, 0);
    },

    getDirectUnreadTotal: () => {
        const state = get();
        return Object.values(state.roomsById).reduce((total, room) => {
            if (room.type !== "DIRECT") return total;
            return total + (state.unreadByRoomId[room.id] ?? room.unreadCount ?? 0);
        }, 0);
    },

    getIncomingFriendRequestCount: () => {
        const state = get();
        const localUserId =
            useUserStore.getState().backendUser?.id;
        if (typeof localUserId !== "number") return 0;

        return state.friendRequests.reduce((count, request) => {
            if (request.requestedByUserId === localUserId) return count;
            return count + 1;
        }, 0);
    },

    markNotificationsRead: async (input) => {
        set({ isLoadingNotifications: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const response = await chatV2Service.markNotificationsRead({
                notificationIds: input?.notificationIds,
                markAll: input?.markAll,
            });

            set((state) => {
                const idsToMark = new Set(input?.notificationIds || []);
                const shouldMarkAll = !!input?.markAll;
                const nowIso = new Date().toISOString();
                return {
                    isLoadingNotifications: false,
                    notifications: state.notifications.map((notification) => {
                        if (notification.readAt) return notification;
                        if (!shouldMarkAll && !idsToMark.has(notification.id)) {
                            return notification;
                        }
                        return {
                            ...notification,
                            readAt: nowIso,
                        };
                    }),
                };
            });

            return response;
        } catch (error) {
            set({
                isLoadingNotifications: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to mark notifications read",
            });
            return {
                markedCount: 0,
                unreadCount: get().getUnreadNotificationCount(),
            };
        }
    },

    getUnreadNotificationCount: () => {
        return get().notifications.reduce((count, notification) => {
            if (notification.readAt) return count;
            return count + 1;
        }, 0);
    },

    createRoom: async (input) => {
        const name = input.name.trim();
        if (!name) return;

        set({ isCreatingRoom: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const payload: {
                name: string;
                topic?: string;
                categoryId?: string | null;
                visibility?: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
                workspaceId?: string;
            } = {
                name,
            };
            if (input.topic !== undefined) payload.topic = input.topic;
            if (input.categoryId !== undefined) payload.categoryId = input.categoryId;
            if (input.visibility !== undefined) payload.visibility = input.visibility;
            const workspaceId = get().selectedWorkspaceId;
            if (workspaceId) payload.workspaceId = workspaceId;

            const room = await chatV2Service.createRoom(payload);

            await get().reloadRoomStructure();
            await get().selectRoom(room.id);

            set({ isCreatingRoom: false });
        } catch (error) {
            set({
                isCreatingRoom: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create room",
            });
        }
    },

    createCategory: async (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set({ isCreatingCategory: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const workspaceId = get().selectedWorkspaceId || undefined;
            await chatV2Service.createCategory(trimmedName, workspaceId);
            await get().reloadRoomStructure();

            set({ isCreatingCategory: false });
        } catch (error) {
            set({
                isCreatingCategory: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create category",
            });
        }
    },

    arrangeRoom: async (roomId, categoryId, position) => {
        if (!roomId) return;

        set({ isArrangingRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.arrangeRoom(roomId, categoryId, position);
            await get().reloadRoomStructure();

            set({ isArrangingRooms: false });
        } catch (error) {
            set({
                isArrangingRooms: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to arrange room",
            });
        }
    },

    arrangeCategory: async (categoryId, position) => {
        if (!categoryId) return;

        set({ isArrangingRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.arrangeCategory(categoryId, position);
            await get().reloadRoomStructure();

            set({ isArrangingRooms: false });
        } catch (error) {
            set({
                isArrangingRooms: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to arrange category",
            });
        }
    },

    renameCategory: async (categoryId, name) => {
        const trimmedName = name.trim();
        if (!categoryId || !trimmedName) return;

        set({ isUpdatingRoom: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.updateCategory(categoryId, trimmedName);
            await get().reloadRoomStructure();

            set({ isUpdatingRoom: false });
        } catch (error) {
            set({
                isUpdatingRoom: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to rename category",
            });
        }
    },

    renameRoom: async (roomId, name) => {
        const trimmedName = name.trim();
        if (!roomId || !trimmedName) return;

        set({ isUpdatingRoom: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.updateRoom(roomId, trimmedName);
            await get().reloadRoomStructure();

            set({ isUpdatingRoom: false });
        } catch (error) {
            set({
                isUpdatingRoom: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to rename room",
            });
        }
    },

    deleteRoom: async (roomId) => {
        if (!roomId) return;

        const previousRoomId = get().currentRoomId;
        set({ isUpdatingRoom: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.deleteRoom(roomId);
            await get().reloadRoomStructure();

            const nextRoomId = get().currentRoomId;
            if (nextRoomId && nextRoomId !== previousRoomId) {
                await get().selectRoom(nextRoomId);
            }

            set((state) => {
                const nextMessagesByRoomId = { ...state.messagesByRoomId };
                const nextMembersByRoomId = { ...state.membersByRoomId };
                delete nextMessagesByRoomId[roomId];
                delete nextMembersByRoomId[roomId];

                return {
                    isUpdatingRoom: false,
                    messagesByRoomId: nextMessagesByRoomId,
                    membersByRoomId: nextMembersByRoomId,
                };
            });
        } catch (error) {
            set({
                isUpdatingRoom: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to delete room",
            });
        }
    },

    loadRoomMembers: async (roomId) => {
        if (!roomId) return;

        set({ isManagingMembers: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const members = await chatV2Service.listRoomMembers(roomId);
            set((state) => ({
                isManagingMembers: false,
                membersByRoomId: {
                    ...state.membersByRoomId,
                    [roomId]: members,
                },
            }));
        } catch (error) {
            set({
                isManagingMembers: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load room members",
            });
        }
    },

    addRoomMember: async (userId, role) => {
        const roomId = get().currentRoomId;
        if (!roomId) return;

        set({ isManagingMembers: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const members = await chatV2Service.addRoomMember(roomId, userId, role);
            set((state) => ({
                isManagingMembers: false,
                membersByRoomId: {
                    ...state.membersByRoomId,
                    [roomId]: members,
                },
            }));
        } catch (error) {
            set({
                isManagingMembers: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to add room member",
            });
        }
    },

    removeRoomMember: async (userId) => {
        const roomId = get().currentRoomId;
        if (!roomId) return;

        set({ isManagingMembers: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const members = await chatV2Service.removeRoomMember(roomId, userId);
            set((state) => ({
                isManagingMembers: false,
                membersByRoomId: {
                    ...state.membersByRoomId,
                    [roomId]: members,
                },
            }));
        } catch (error) {
            set({
                isManagingMembers: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to remove room member",
            });
        }
    },

    loadPinnedMessages: async (roomId) => {
        set({ isLoadingPinnedMessages: true });
        try {
            const chatV2Service = getChatV2Service();
            const pinnedMessages = await chatV2Service.listPinnedMessages(roomId);
            set((state) => ({
                isLoadingPinnedMessages: false,
                pinnedMessagesByRoomId: {
                    ...state.pinnedMessagesByRoomId,
                    [roomId]: pinnedMessages,
                },
            }));
        } catch {
            set({ isLoadingPinnedMessages: false });
        }
    },

    pinMessage: async (roomId, messageId) => {
        try {
            const chatV2Service = getChatV2Service();
            const pinnedMessage = await chatV2Service.pinMessage(roomId, messageId);
            set((state) => {
                const current = state.pinnedMessagesByRoomId[roomId] || [];
                const exists = current.some((p) => p.id === pinnedMessage.id);
                if (exists) return {};
                return {
                    pinnedMessagesByRoomId: {
                        ...state.pinnedMessagesByRoomId,
                        [roomId]: [pinnedMessage, ...current],
                    },
                };
            });
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to pin message",
            });
        }
    },

    unpinMessage: async (roomId, messageId) => {
        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.unpinMessage(roomId, messageId);
            set((state) => {
                const current = state.pinnedMessagesByRoomId[roomId] || [];
                return {
                    pinnedMessagesByRoomId: {
                        ...state.pinnedMessagesByRoomId,
                        [roomId]: current.filter((p) => p.messageId !== messageId),
                    },
                };
            });
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to unpin message",
            });
        }
    },

    setTypingUser: (roomId: string, userId: number, displayName: string) => {
        set((state) => {
            const current = state.typingUsersByRoomId[roomId] || [];
            const expiresAt = Date.now() + 6000;
            const filtered = current.filter((t) => t.userId !== userId);
            return {
                typingUsersByRoomId: {
                    ...state.typingUsersByRoomId,
                    [roomId]: [...filtered, { userId, displayName, expiresAt }],
                },
            };
        });
    },

    clearTypingUser: (roomId: string, userId: number) => {
        set((state) => {
            const current = state.typingUsersByRoomId[roomId];
            if (!current) return {};
            const filtered = current.filter((t) => t.userId !== userId);
            if (filtered.length === current.length) return {};
            return {
                typingUsersByRoomId: {
                    ...state.typingUsersByRoomId,
                    [roomId]: filtered,
                },
            };
        });
    },

    clear: () =>
        set({
            initialized: false,
            railView: "server",
            selectedWorkspaceId: null,
            isLoadingRooms: false,
            isLoadingDirectRooms: false,
            isLoadingFriends: false,
            isLoadingFriendRequests: false,
            isLoadingNotifications: false,
            isLoadingMessages: false,
            isLoadingOlderMessages: false,
            hasMoreMessagesByRoomId: {},
            isSending: false,
            isCreatingRoom: false,
            isCreatingCategory: false,
            isArrangingRooms: false,
            isUpdatingRoom: false,
            isManagingMembers: false,
            error: null,
            roomsById: {},
            roomOrder: [],
            unreadByRoomId: {},
            directRoomsById: {},
            directRoomOrder: [],
            frequentEmojis: [],
            reactionReactorsCache: {},
            friends: [],
            friendRequests: [],
            notifications: [],
            categoriesById: {},
            categoryOrder: [],
            currentRoomId: null,
            messagesByRoomId: {},
            membersByRoomId: {},
            pinnedMessagesByRoomId: {},
            isLoadingPinnedMessages: false,
            typingUsersByRoomId: {},
        }),
}));

export default useChatV2Store;
