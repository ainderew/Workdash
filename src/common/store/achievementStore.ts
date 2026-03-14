import { create } from "zustand";
import type {
    AchievementUnlockPayload,
    AchievementWithStatus,
    DisplayAchievement,
} from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";

interface AchievementState {
    achievements: AchievementWithStatus[];
    isLoaded: boolean;
    isLoading: boolean;
    displayByUserId: Record<number, DisplayAchievement[]>;

    loadAchievements: () => Promise<void>;
    handleUnlock: (payload: AchievementUnlockPayload) => void;
    loadUserDisplay: (userId: number) => Promise<DisplayAchievement[]>;
    updateMyDisplay: (
        items: Array<{ achievementKey: string; position: number }>,
    ) => Promise<void>;
}

const useAchievementStore = create<AchievementState>((set, get) => ({
    achievements: [],
    isLoaded: false,
    isLoading: false,
    displayByUserId: {},

    loadAchievements: async () => {
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
            const chatService = ChatV2Service.getInstance();
            const achievements = await chatService.getAchievements();
            set({ achievements, isLoaded: true });
        } catch (error) {
            console.error("[achievements] Failed to load:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    handleUnlock: (payload) => {
        set((state) => {
            const updated = state.achievements.map((a) =>
                a.key === payload.achievementKey
                    ? {
                          ...a,
                          unlockedAt: new Date().toISOString(),
                          currentCount: Math.max(a.currentCount, a.threshold),
                      }
                    : a,
            );
            return { achievements: updated };
        });
    },

    loadUserDisplay: async (userId) => {
        const cached = get().displayByUserId[userId];
        if (cached) return cached;

        try {
            const chatService = ChatV2Service.getInstance();
            const display = await chatService.getUserAchievementDisplay(userId);
            set((state) => ({
                displayByUserId: {
                    ...state.displayByUserId,
                    [userId]: display,
                },
            }));
            return display;
        } catch (error) {
            console.error("[achievements] Failed to load display:", error);
            return [];
        }
    },

    updateMyDisplay: async (items) => {
        try {
            const chatService = ChatV2Service.getInstance();
            await chatService.updateMyAchievementDisplay(items);
        } catch (error) {
            console.error("[achievements] Failed to update display:", error);
            throw error;
        }
    },
}));

export default useAchievementStore;
