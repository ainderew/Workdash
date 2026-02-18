import { create } from "zustand";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type {
    ChatV2CreateAttachment,
    ChatV2DirectRoom,
    ChatV2Friend,
    ChatV2FriendshipStatus,
    ChatV2Message,
    ChatV2Room,
    ChatV2RoomCategory,
    ChatV2RoomMember,
    ChatV2UserNotification,
} from "@/communication/chatV2/_types";

type MessageDeletePayload = {
    roomId: string;
    messageId: string;
    deletedAt: string | Date | null;
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
    friends: ChatV2Friend[];
    friendRequests: ChatV2Friend[];
    notifications: ChatV2UserNotification[];
    categoriesById: Record<string, ChatV2RoomCategory>;
    categoryOrder: string[];
    currentRoomId: string | null;
    messagesByRoomId: Record<string, ChatV2Message[]>;
    membersByRoomId: Record<string, ChatV2RoomMember[]>;
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
    sendMessage: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
        options?: {
            replyToMessageId?: string;
        },
    ) => Promise<ChatV2Message | null>;
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
    [...messages].sort(byCreatedAtAsc);

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
    const existingIndex = messages.findIndex(
        (message) =>
            message.id === nextMessage.id ||
            message.clientMessageId === nextMessage.clientMessageId,
    );

    if (existingIndex === -1) {
        return {
            messages: sortMessages([...messages, nextMessage]),
            inserted: true,
        };
    }

    const updated = [...messages];
    updated[existingIndex] = {
        ...updated[existingIndex],
        ...nextMessage,
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
        name: replyMessage.sender?.name || `User ${replyMessage.senderUserId}`,
        image: replyMessage.sender?.image || null,
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
    friends: [],
    friendRequests: [],
    notifications: [],
    categoriesById: {},
    categoryOrder: [],
    currentRoomId: null,
    messagesByRoomId: {},
    membersByRoomId: {},

    setRailView: (view) => {
        set({ railView: view });
    },

    setSelectedWorkspaceId: (workspaceId) => {
        set({ selectedWorkspaceId: workspaceId });
    },

    initialize: async () => {
        if (get().initialized) return;

        set({ isLoadingRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            chatV2Service.setupRealtimeHandlers({
                onMessageNew: (message) => {
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
                                        typeof window !== "undefined"
                                            ? window.__BACKEND_USER__?.id
                                            : undefined;
                                    const isOwnMessage =
                                        typeof localUserId === "number"
                                        && localUserId === message.senderUserId;
                                    if (isOwnMessage || state.currentRoomId === message.roomId) {
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
                onNotificationNew: (notification) => {
                    set((state) => ({
                        notifications: upsertNotification(
                            state.notifications,
                            notification,
                        ),
                    }));
                },
            });

            await get().reloadRoomStructure();
            await Promise.all([
                get().reloadDirectRooms(),
                get().reloadFriends("ACCEPTED"),
                get().reloadFriendRequests(),
                get().reloadNotifications({ limit: 100 }),
            ]);

            const currentRoomId = get().currentRoomId;
            if (currentRoomId) {
                await get().selectRoom(currentRoomId);
            }

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
            const [rooms, categories] = await Promise.all([
                chatV2Service.listRooms(),
                chatV2Service.listCategories(),
            ]);

            const roomsById = toRoomsById(rooms);
            const roomOrder = toRoomOrder(rooms);
            const unreadByRoomId = toUnreadByRoomId(rooms);
            const categoriesById = toCategoriesById(categories);
            const categoryOrder = toCategoryOrder(categories);

            set((state) => {
                const hasCurrentRoom =
                    state.currentRoomId && roomsById[state.currentRoomId];
                const firstServerRoom = roomOrder
                    .map((roomId) => roomsById[roomId])
                    .find((room) => room?.type !== "DIRECT");
                const hasSelectedWorkspace = state.selectedWorkspaceId
                    && roomOrder.some((roomId) => {
                        const room = roomsById[roomId];
                        return (
                            !!room
                            && room.type !== "DIRECT"
                            && room.workspaceId === state.selectedWorkspaceId
                        );
                    });

                return {
                    isLoadingRooms: false,
                    roomsById,
                    roomOrder,
                    unreadByRoomId: {
                        ...state.unreadByRoomId,
                        ...unreadByRoomId,
                    },
                    categoriesById,
                    categoryOrder,
                    currentRoomId: hasCurrentRoom
                        ? state.currentRoomId
                        : (firstServerRoom?.id ?? roomOrder[0] ?? null),
                    selectedWorkspaceId: hasSelectedWorkspace
                        ? state.selectedWorkspaceId
                        : (firstServerRoom?.workspaceId ?? null),
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
                        ...state.unreadByRoomId,
                        ...unreadByRoomId,
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
        set({
            currentRoomId: roomId,
            isLoadingMessages: true,
            error: null,
            railView: room?.type === "DIRECT" ? "dm" : "server",
            selectedWorkspaceId:
                room && room.type !== "DIRECT"
                    ? room.workspaceId
                    : get().selectedWorkspaceId,
        });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.joinRoom(roomId);
            const messages = await chatV2Service.listMessages(roomId, 100, {
                rootOnly: true,
                includeReplySummary: true,
            });
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
            }));

            await get().loadRoomMembers(roomId);
            await get().markRoomRead(roomId, lastMessageId);
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

    sendMessage: async (content, attachments, options) => {
        const trimmed = content.trim();
        if (!trimmed && !attachments?.length) return null;

        const roomId = get().currentRoomId;
        if (!roomId) return null;
        const replyToMessageId = options?.replyToMessageId?.trim() || undefined;

        set({ isSending: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const message = await chatV2Service.createMessage(
                roomId,
                trimmed,
                attachments,
                {
                    replyToMessageId,
                },
            );

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
            typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;
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
            const room = await chatV2Service.createRoom({
                name,
                topic: input.topic,
                categoryId: input.categoryId,
                visibility: input.visibility,
            });

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
            await chatV2Service.createCategory(trimmedName);
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
            friends: [],
            friendRequests: [],
            notifications: [],
            categoriesById: {},
            categoryOrder: [],
            currentRoomId: null,
            messagesByRoomId: {},
            membersByRoomId: {},
        }),
}));

export default useChatV2Store;
