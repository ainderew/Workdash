import { create } from "zustand";
import type { Message } from "@/communication/textChat/_types";
import useUiStore from "./uiStore";

const notificationSound = new Audio("/assets/sounds/notification.mp3");

const playNotificationSound = () => {
    notificationSound.currentTime = 0;
    notificationSound.volume = 0.3;
    notificationSound.play().catch(() => {});
};

interface MessagingState {
    messages: Message[];
    unreadCount: number;
    currentUserSocketId: string | null;
    notificationsMuted: boolean;

    setCurrentUserSocketId: (socketId: string) => void;
    addMessage: (message: Message) => void;
    markAsRead: () => void;
    clearMessages: () => void;
    toggleNotifications: () => void;
}

const useMessagingStore = create<MessagingState>((set) => ({
    messages: [],
    unreadCount: 0,
    currentUserSocketId: null,
    notificationsMuted: false,

    setCurrentUserSocketId: (socketId) =>
        set({ currentUserSocketId: socketId }),

    addMessage: (message) =>
        set((state) => {
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

    markAsRead: () => set({ unreadCount: 0 }),

    clearMessages: () => set({ messages: [], unreadCount: 0 }),

    toggleNotifications: () =>
        set((state) => ({ notificationsMuted: !state.notificationsMuted })),
}));

export default useMessagingStore;
