import { create } from 'zustand';

interface FocusState {
  localFocusMode: boolean;
  remoteFocusByUserId: Record<number, boolean>;

  setLocalFocusMode: (enabled: boolean) => void;
  setRemoteFocusMode: (userId: number, isInFocusMode: boolean) => void;
  removeRemoteFocusMode: (userId: number) => void;
  reset: () => void;
}

const useFocusStore = create<FocusState>((set) => ({
  localFocusMode: false,
  remoteFocusByUserId: {},

  setLocalFocusMode: (enabled) => set({ localFocusMode: enabled }),

  setRemoteFocusMode: (userId, isInFocusMode) =>
    set((state) => ({
      remoteFocusByUserId: {
        ...state.remoteFocusByUserId,
        [userId]: isInFocusMode,
      },
    })),

  removeRemoteFocusMode: (userId) =>
    set((state) => {
      const next = { ...state.remoteFocusByUserId };
      delete next[userId];
      return { remoteFocusByUserId: next };
    }),

  reset: () => set({ localFocusMode: false, remoteFocusByUserId: {} }),
}));

export default useFocusStore;
