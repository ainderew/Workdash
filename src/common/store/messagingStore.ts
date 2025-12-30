import { create } from "zustand";
import type { Message, MessageStatus } from "@/communication/textChat/_types";
import useUiStore from "./uiStore";

const notificationSound = new Audio("/assets/sounds/notification.mp3");

const playNotificationSound = () => {
    notificationSound.currentTime = 0;
    notificationSound.volume = 0.3;
    notificationSound.play().catch(() => {});
};

export interface MessagingState {
    messages: Message[];
    unreadCount: number;
    currentUserSocketId: string | null;
    notificationsMuted: boolean;

    setCurrentUserSocketId: (socketId: string) => void;
    addMessage: (message: Message) => void;
    addOptimisticMessage: (message: Message) => void;
    updateMessageStatus: (
        clientId: string,
        status: MessageStatus,
        serverMessage?: Message
    ) => void;
    retryMessage: (clientId: string) => Message | null;
    markAsRead: () => void;
    clearMessages: () => void;
    toggleNotifications: () => void;
}

const useMessagingStore = create<MessagingState>((set) => ({
    messages: [],
    unreadCount: 0,
    currentUserSocketId: null,
    notificationsMuted: false,

    setCurrentUserSocketId: (socketId: string) =>
        set({ currentUserSocketId: socketId }),

    addMessage: (message: Message) =>
        set((state: MessagingState) => {
            const isOwnMessage =
                message.senderSocketId === state.currentUserSocketId;
            const isChatOpen = useUiStore.getState().isChatWindowOpen;
            const shouldIncrement = !isOwnMessage && !isChatOpen;

            if (shouldIncrement && !state.notificationsMuted) {
                playNotificationSound();
            }

            return {
                messages: [...state.messages, message],
                unreadCount: shouldIncrement
                    ? state.unreadCount + 1
                    : state.unreadCount,
            };
        }),

    addOptimisticMessage: (message: Message) =>
        set((state: MessagingState) => ({
            messages: [...state.messages, message],
        })),

    updateMessageStatus: (clientId: string, status: MessageStatus, serverMessage?: Message) =>
        set((state: MessagingState) => {
            const messageIndex = state.messages.findIndex(
                (m: Message) => m.clientId === clientId
            );

            if (messageIndex === -1) {
                console.warn(`Message with clientId ${clientId} not found`);
                return state;
            }

            const updatedMessages = [...state.messages];
            if (status === "sent" && serverMessage) {
                updatedMessages[messageIndex] = {
                    ...serverMessage,
                    status: "sent",
                };
            } else {
                updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    status,
                };
            }

            return { messages: updatedMessages };
        }),

    retryMessage: (clientId: string): Message | null => {
        const state = useMessagingStore.getState();
        const message = state.messages.find(
            (m: Message) => m.clientId === clientId && m.status === "failed"
        );

        if (!message) {
            return null;
        }

        set((state: MessagingState) => {
            const messageIndex = state.messages.findIndex(
                (m: Message) => m.clientId === clientId
            );

            if (messageIndex === -1) return state;

            const updatedMessages = [...state.messages];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                status: "pending",
            };

            return { messages: updatedMessages };
        });

        return message;
    },

    markAsRead: () => set({ unreadCount: 0 }),

    clearMessages: () => set({ messages: [], unreadCount: 0 }),

    toggleNotifications: () =>
        set((state: MessagingState) => ({ notificationsMuted: !state.notificationsMuted })),
}));

export default useMessagingStore;
