import { create } from 'zustand';
import type { SoundboardSound } from '@/common/components/Soundboard/_types';

type SoundboardState = {
  workspaceSounds: SoundboardSound[];
  personalSounds: SoundboardSound[];
  isLoading: boolean;
  fetchedWorkspaceId: string | null;
  isPlaying: boolean;
  lastPlayedAt: number | null;
  cooldownMs: number;

  setSounds: (workspace: SoundboardSound[], personal: SoundboardSound[]) => void;
  setLoading: (loading: boolean) => void;
  setFetchedWorkspaceId: (id: string | null) => void;
  addSound: (sound: SoundboardSound) => void;
  removeSound: (soundId: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setLastPlayedAt: (timestamp: number) => void;
  canPlay: () => boolean;
};

const useSoundboardStore = create<SoundboardState>((set, get) => ({
  workspaceSounds: [],
  personalSounds: [],
  isLoading: false,
  fetchedWorkspaceId: null,
  isPlaying: false,
  lastPlayedAt: null,
  cooldownMs: 5000,

  setSounds: (workspace, personal) =>
    set({ workspaceSounds: workspace, personalSounds: personal }),

  setLoading: (loading) => set({ isLoading: loading }),

  setFetchedWorkspaceId: (id) => set({ fetchedWorkspaceId: id }),

  addSound: (sound) =>
    set((state) => {
      if (sound.workspaceId) {
        if (state.workspaceSounds.some((s) => s.id === sound.id)) return state;
        return { workspaceSounds: [...state.workspaceSounds, sound] };
      }
      if (state.personalSounds.some((s) => s.id === sound.id)) return state;
      return { personalSounds: [...state.personalSounds, sound] };
    }),

  removeSound: (soundId) =>
    set((state) => ({
      workspaceSounds: state.workspaceSounds.filter((s) => s.id !== soundId),
      personalSounds: state.personalSounds.filter((s) => s.id !== soundId),
    })),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setLastPlayedAt: (timestamp) => set({ lastPlayedAt: timestamp }),

  canPlay: () => {
    const { isPlaying, lastPlayedAt, cooldownMs } = get();
    if (isPlaying) return false;
    if (!lastPlayedAt) return true;
    return Date.now() - lastPlayedAt >= cooldownMs;
  },
}));

export default useSoundboardStore;
