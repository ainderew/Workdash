import { create } from "zustand";

export interface FloatingReaction {
  id: string;
  userId: number;
  emoji: string;
  timestamp: number;
}

interface CallReactionState {
  /** Transient emoji reactions — auto-expire after 3s, max 5 per user visible */
  floatingReactions: FloatingReaction[];

  /** Set of userIds currently raising hand — persistent until toggled off */
  raisedHands: Set<number>;

  /** Add a floating reaction (auto-generates id + timestamp) */
  addReaction: (userId: number, emoji: string) => void;

  /** Remove a single floating reaction by id (called on animation end) */
  removeReaction: (id: string) => void;

  /** Set or clear a user's raised hand */
  setHandRaised: (userId: number, raised: boolean) => void;

  /** Check if a user has their hand raised */
  isHandRaised: (userId: number) => boolean;

  /** Clear all state (call on leave/disconnect) */
  clearAll: () => void;
}

const MAX_REACTIONS_PER_USER = 5;

const useCallReactionStore = create<CallReactionState>((set, get) => ({
  floatingReactions: [],
  raisedHands: new Set<number>(),

  addReaction: (userId, emoji) =>
    set((state) => {
      const userReactions = state.floatingReactions.filter(
        (r) => r.userId === userId,
      );
      const otherReactions = state.floatingReactions.filter(
        (r) => r.userId !== userId,
      );

      // Cap at MAX_REACTIONS_PER_USER per user — drop oldest if at limit
      const trimmed =
        userReactions.length >= MAX_REACTIONS_PER_USER
          ? userReactions.slice(1)
          : userReactions;

      const newReaction: FloatingReaction = {
        id: crypto.randomUUID(),
        userId,
        emoji,
        timestamp: Date.now(),
      };

      return {
        floatingReactions: [...otherReactions, ...trimmed, newReaction],
      };
    }),

  removeReaction: (id) =>
    set((state) => ({
      floatingReactions: state.floatingReactions.filter((r) => r.id !== id),
    })),

  setHandRaised: (userId, raised) =>
    set((state) => {
      const next = new Set(state.raisedHands);
      if (raised) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return { raisedHands: next };
    }),

  isHandRaised: (userId) => get().raisedHands.has(userId),

  clearAll: () =>
    set(() => ({
      floatingReactions: [],
      raisedHands: new Set<number>(),
    })),
}));

export default useCallReactionStore;
