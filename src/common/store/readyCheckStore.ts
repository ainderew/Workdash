import { create } from "zustand";
import type { ReadyCheckSnapshot } from "@/communication/readyCheck/_types";

interface ReadyCheckStoreState {
  /** Active or recently-resolved check per channel, keyed by channelId.
   *  Resolved snapshots are kept so the bot card can render its final state. */
  currentCheckByChannelId: Record<string, ReadyCheckSnapshot>;

  /** The checkId the local user has been prompted for. null when no prompt is active.
   *  Drives the modal — when non-null, ReadyCheckOverlay renders. */
  activePromptCheckId: string | null;

  /** Local optimistic response, keyed by checkId. */
  localResponseByCheckId: Record<string, "ready" | "not-ready">;

  applySnapshot: (snapshot: ReadyCheckSnapshot) => void;
  setActivePromptCheckId: (checkId: string | null) => void;
  recordLocalResponse: (
    checkId: string,
    response: "ready" | "not-ready",
  ) => void;
  /** Drop resolved snapshots; keep active ones (used on workspace switch). */
  pruneResolved: () => void;
  reset: () => void;
}

const useReadyCheckStore = create<ReadyCheckStoreState>((set) => ({
  currentCheckByChannelId: {},
  activePromptCheckId: null,
  localResponseByCheckId: {},

  applySnapshot: (snapshot) =>
    set((state) => {
      const next = {
        ...state.currentCheckByChannelId,
        [snapshot.channelId]: snapshot,
      };
      // Clear the active prompt if this snapshot resolves the one we were prompted for.
      const clearPrompt =
        snapshot.resolved && state.activePromptCheckId === snapshot.checkId;
      return {
        currentCheckByChannelId: next,
        activePromptCheckId: clearPrompt ? null : state.activePromptCheckId,
      };
    }),

  setActivePromptCheckId: (checkId) =>
    set(() => ({ activePromptCheckId: checkId })),

  recordLocalResponse: (checkId, response) =>
    set((state) => ({
      localResponseByCheckId: {
        ...state.localResponseByCheckId,
        [checkId]: response,
      },
      // Optimistically clear the modal as soon as the user responds.
      activePromptCheckId:
        state.activePromptCheckId === checkId
          ? null
          : state.activePromptCheckId,
    })),

  pruneResolved: () =>
    set((state) => {
      const next: Record<string, ReadyCheckSnapshot> = {};
      let changed = false;
      for (const [channelId, snapshot] of Object.entries(
        state.currentCheckByChannelId,
      )) {
        if (snapshot.resolved) {
          changed = true;
          continue;
        }
        next[channelId] = snapshot;
      }
      if (!changed) return state;
      return { currentCheckByChannelId: next };
    }),

  reset: () =>
    set(() => ({
      currentCheckByChannelId: {},
      activePromptCheckId: null,
      localResponseByCheckId: {},
    })),
}));

export default useReadyCheckStore;

/** Selector: snapshot for a given checkId, or null. */
export function selectSnapshotByCheckId(
  state: ReadyCheckStoreState,
  checkId: string | null,
): ReadyCheckSnapshot | null {
  if (!checkId) return null;
  for (const snapshot of Object.values(state.currentCheckByChannelId)) {
    if (snapshot.checkId === checkId) return snapshot;
  }
  return null;
}

/** Selector: is the local user a pending target for the given checkId? */
export function selectIsLocalUserPending(
  state: ReadyCheckStoreState,
  localUserId: number | null | undefined,
  checkId: string | null,
): boolean {
  if (!localUserId || !checkId) return false;
  const snapshot = selectSnapshotByCheckId(state, checkId);
  if (!snapshot || snapshot.resolved) return false;
  const target = snapshot.targets.find((t) => t.userId === localUserId);
  return target?.state === "pending";
}
