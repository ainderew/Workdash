import { create } from "zustand";
import { AudioChat } from "@/communication/audioChat/audioChat";

export type AudioQualityMode = 'standard' | 'studio';

interface AudioState {
    userVolumes: Map<number, number>;
    userMuted: Map<number, number>;
    musicVolume: number;
    audioQualityMode: AudioQualityMode;

    setUserVolume: (userId: number, volume: number) => void;
    toggleUserMute: (userId: number) => void;
    getUserVolume: (userId: number) => number;
    isUserMuted: (userId: number) => boolean;
    getMusicVolume: () => number;
    setMusicVolume: (volume: number) => void;
    setAudioQualityMode: (mode: AudioQualityMode) => void;
}

const useAudioStore = create<AudioState>((set, get) => ({
    userVolumes: new Map<number, number>(),
    userMuted: new Map<number, number>(),
    musicVolume: 0.5,
    audioQualityMode: 'standard' as AudioQualityMode,

    setUserVolume: (userId: number, volume: number) => {
        set((state) => {
            const newVolumes = new Map(state.userVolumes);
            newVolumes.set(userId, volume);
            return { userVolumes: newVolumes };
        });

        const audioChat = AudioChat.getInstance();
        audioChat.setUserVolume(userId, volume);
    },

    toggleUserMute: (userId: number) => {
        set((state) => {
            const newMuted = new Map(state.userMuted);
            const currentVolume = state.userVolumes.get(userId) || 1.0;
            const savedVolume = newMuted.get(userId);

            if (savedVolume !== undefined) {
                newMuted.delete(userId);
                const audioChat = AudioChat.getInstance();
                audioChat.setUserVolume(userId, savedVolume);
            } else {
                newMuted.set(userId, currentVolume);
                const audioChat = AudioChat.getInstance();
                audioChat.setUserVolume(userId, 0);
            }

            return { userMuted: newMuted };
        });
    },

    getUserVolume: (userId: number) => {
        return get().userVolumes.get(userId) || 1.0;
    },

    isUserMuted: (userId: number) => {
        return get().userMuted.has(userId);
    },

    getMusicVolume: () => {
        return get().musicVolume;
    },

    setMusicVolume: (volume: number) => {
        set({ musicVolume: Math.max(0, Math.min(1, volume)) });
    },

    setAudioQualityMode: (mode: AudioQualityMode) => {
        set({ audioQualityMode: mode });
    },
}));

export default useAudioStore;
