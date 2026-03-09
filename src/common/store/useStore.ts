import { create } from "zustand";
import { User, UserStore } from "./_types";
import { CharacterCustomization } from "@/game/character/_types";
import { BackendUser } from "@/types/auth";

const useUserStore = create<UserStore>((set) => ({
    user: {
        name: "",
        nickname: null,
        producerIds: [],
        image: undefined,
        spriteSheetDataUrl: undefined,
        socketId: undefined,
    },
    backendUser: null,
    setUser: (user: User) => set({ user }),
    updateUser: (updates: Partial<User>) =>
        set((state) => ({ user: { ...state.user, ...updates } })),
    setBackendUser: (user: BackendUser) => set({ backendUser: user }),
    updateBackendUser: (updates: Partial<BackendUser>) =>
        set((state) => ({
            backendUser: state.backendUser
                ? { ...state.backendUser, ...updates }
                : null,
        })),
    setCharacterCustomization: (customization: CharacterCustomization) =>
        set((state) => ({
            user: { ...state.user, characterCustomization: customization },
        })),
}));

export default useUserStore;
