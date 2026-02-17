import { create } from "zustand";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type {
    ChatV2CreateAttachment,
    ChatV2Message,
    ChatV2Room,
    ChatV2RoomCategory,
    ChatV2RoomMember,
} from "@/communication/chatV2/_types";

type MessageDeletePayload = {
    roomId: string;
    messageId: string;
    deletedAt: string | Date | null;
};

type ChatV2State = {
    initialized: boolean;
    isLoadingRooms: boolean;
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
    categoriesById: Record<string, ChatV2RoomCategory>;
    categoryOrder: string[];
    currentRoomId: string | null;
    messagesByRoomId: Record<string, ChatV2Message[]>;
    membersByRoomId: Record<string, ChatV2RoomMember[]>;
    initialize: () => Promise<void>;
    reloadRoomStructure: () => Promise<void>;
    selectRoom: (roomId: string) => Promise<void>;
    sendMessage: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
    ) => Promise<void>;
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

const toCategoryOrder = (categories: ChatV2RoomCategory[]) =>
    [...categories].sort(byCategoryLayout).map((category) => category.id);

const upsertMessage = (
    messages: ChatV2Message[],
    nextMessage: ChatV2Message,
): ChatV2Message[] => {
    const existingIndex = messages.findIndex(
        (message) =>
            message.id === nextMessage.id ||
            message.clientMessageId === nextMessage.clientMessageId,
    );

    if (existingIndex === -1) {
        return sortMessages([...messages, nextMessage]);
    }

    const updated = [...messages];
    updated[existingIndex] = {
        ...updated[existingIndex],
        ...nextMessage,
    };

    return sortMessages(updated);
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

const useChatV2Store = create<ChatV2State>((set, get) => ({
    initialized: false,
    isLoadingRooms: false,
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
    categoriesById: {},
    categoryOrder: [],
    currentRoomId: null,
    messagesByRoomId: {},
    membersByRoomId: {},

    initialize: async () => {
        if (get().initialized) return;

        set({ isLoadingRooms: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            chatV2Service.setupRealtimeHandlers({
                onMessageNew: (message) => {
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
            });

            await get().reloadRoomStructure();

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
            const categoriesById = toCategoriesById(categories);
            const categoryOrder = toCategoryOrder(categories);

            set((state) => {
                const hasCurrentRoom =
                    state.currentRoomId && roomsById[state.currentRoomId];

                return {
                    isLoadingRooms: false,
                    roomsById,
                    roomOrder,
                    categoriesById,
                    categoryOrder,
                    currentRoomId: hasCurrentRoom
                        ? state.currentRoomId
                        : (roomOrder[0] ?? null),
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

    selectRoom: async (roomId) => {
        if (!roomId) return;

        set({ currentRoomId: roomId, isLoadingMessages: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            await chatV2Service.joinRoom(roomId);
            const messages = await chatV2Service.listMessages(roomId, 100);

            set((state) => ({
                isLoadingMessages: false,
                messagesByRoomId: {
                    ...state.messagesByRoomId,
                    [roomId]: sortMessages(messages),
                },
            }));

            await get().loadRoomMembers(roomId);
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

    sendMessage: async (content, attachments) => {
        const trimmed = content.trim();
        if (!trimmed && !attachments?.length) return;

        const roomId = get().currentRoomId;
        if (!roomId) return;

        set({ isSending: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const message = await chatV2Service.createMessage(
                roomId,
                trimmed,
                attachments,
            );

            set((state) => ({
                isSending: false,
                messagesByRoomId: {
                    ...state.messagesByRoomId,
                    [roomId]: upsertMessage(
                        state.messagesByRoomId[roomId] || [],
                        message,
                    ),
                },
            }));
        } catch (error) {
            set({
                isSending: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to send message",
            });
        }
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
            isLoadingRooms: false,
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
            categoriesById: {},
            categoryOrder: [],
            currentRoomId: null,
            messagesByRoomId: {},
            membersByRoomId: {},
        }),
}));

export default useChatV2Store;
