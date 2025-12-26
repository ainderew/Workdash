import { create } from "zustand";
import { User, UserStore } from "./_types";
import { CharacterCustomization } from "@/game/character/_types";

const useUserStore = create<UserStore>((set) => ({
    user: {
        name: "",
        producerIds: [],
        image: undefined,
        spriteSheetDataUrl: undefined,
        socketId: undefined,
    },
    setUser: (user: User) => set({ user }),
    updateUser: (updates: Partial<User>) =>
        set((state) => ({ user: { ...state.user, ...updates } })),
    setCharacterCustomization: (customization: CharacterCustomization) =>
        set((state) => ({
            user: { ...state.user, characterCustomization: customization },
        })),
}));

export default useUserStore;
