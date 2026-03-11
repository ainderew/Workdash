import { create } from 'zustand';

export type CustomEmoji = {
  id: string;
  workspaceId: string;
  name: string;
  imageUrl: string;
  isAnimated: boolean;
  uploadedBy: number;
  createdAt: string;
};

type CustomEmojiState = {
  emojisByWorkspace: Record<string, CustomEmoji[]>;
  loadingWorkspaces: Set<string>;

  setEmojis: (workspaceId: string, emojis: CustomEmoji[]) => void;
  setLoading: (workspaceId: string, loading: boolean) => void;
  addEmoji: (emoji: CustomEmoji) => void;
  removeEmoji: (workspaceId: string, emojiId: string) => void;
  renameEmoji: (workspaceId: string, emojiId: string, newName: string) => void;
  getEmojisForWorkspace: (workspaceId: string) => CustomEmoji[];
  findEmojiById: (emojiId: string) => CustomEmoji | undefined;
};

const useCustomEmojiStore = create<CustomEmojiState>((set, get) => ({
  emojisByWorkspace: {},
  loadingWorkspaces: new Set(),

  setEmojis: (workspaceId, emojis) =>
    set((state) => ({
      emojisByWorkspace: {
        ...state.emojisByWorkspace,
        [workspaceId]: emojis,
      },
    })),

  setLoading: (workspaceId, loading) =>
    set((state) => {
      const next = new Set(state.loadingWorkspaces);
      if (loading) next.add(workspaceId);
      else next.delete(workspaceId);
      return { loadingWorkspaces: next };
    }),

  addEmoji: (emoji) =>
    set((state) => {
      const existing = state.emojisByWorkspace[emoji.workspaceId] ?? [];
      // Avoid duplicates
      if (existing.some((e) => e.id === emoji.id)) return state;
      return {
        emojisByWorkspace: {
          ...state.emojisByWorkspace,
          [emoji.workspaceId]: [...existing, emoji],
        },
      };
    }),

  removeEmoji: (workspaceId, emojiId) =>
    set((state) => {
      const existing = state.emojisByWorkspace[workspaceId] ?? [];
      return {
        emojisByWorkspace: {
          ...state.emojisByWorkspace,
          [workspaceId]: existing.filter((e) => e.id !== emojiId),
        },
      };
    }),

  renameEmoji: (workspaceId, emojiId, newName) =>
    set((state) => {
      const existing = state.emojisByWorkspace[workspaceId] ?? [];
      return {
        emojisByWorkspace: {
          ...state.emojisByWorkspace,
          [workspaceId]: existing.map((e) =>
            e.id === emojiId ? { ...e, name: newName } : e,
          ),
        },
      };
    }),

  getEmojisForWorkspace: (workspaceId) =>
    get().emojisByWorkspace[workspaceId] ?? [],

  findEmojiById: (emojiId) => {
    const all = Object.values(get().emojisByWorkspace);
    for (const list of all) {
      const found = list.find((e) => e.id === emojiId);
      if (found) return found;
    }
    return undefined;
  },
}));

export default useCustomEmojiStore;
