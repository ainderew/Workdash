import { create } from "zustand";
import { AudioChat } from "@/communication/audioChat/audioChat";

interface AudioState {
    userVolumes: Map<string, number>;
    userMuted: Map<string, number>;

    setUserVolume: (userName: string, volume: number) => void;
    toggleUserMute: (userName: string) => void;
    getUserVolume: (userName: string) => number;
    isUserMuted: (userName: string) => boolean;
}

const useAudioStore = create<AudioState>((set, get) => ({
    userVolumes: new Map<string, number>(),
    userMuted: new Map<string, number>(),

    setUserVolume: (userName: string, volume: number) => {
        set((state) => {
            const newVolumes = new Map(state.userVolumes);
            newVolumes.set(userName, volume);
            return { userVolumes: newVolumes };
        });

        // Apply immediately
        const audioChat = AudioChat.getInstance();
        audioChat.setUserVolume(userName, volume);
    },

    toggleUserMute: (userName: string) => {
        set((state) => {
            const newMuted = new Map(state.userMuted);
            const currentVolume = state.userVolumes.get(userName) || 1.0;
            const savedVolume = newMuted.get(userName);

            if (savedVolume !== undefined) {
                // Unmute: restore volume
                newMuted.delete(userName);
                const audioChat = AudioChat.getInstance();
                audioChat.setUserVolume(userName, savedVolume);
            } else {
                // Mute: save volume and set to 0
                newMuted.set(userName, currentVolume);
                const audioChat = AudioChat.getInstance();
                audioChat.setUserVolume(userName, 0);
            }

            return { userMuted: newMuted };
        });
    },

    getUserVolume: (userName: string) => {
        return get().userVolumes.get(userName) || 1.0;
    },

    isUserMuted: (userName: string) => {
        return get().userMuted.has(userName);
    },
}));

export default useAudioStore;
