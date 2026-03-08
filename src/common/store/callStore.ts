import { create } from "zustand";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface CallParticipantMedia {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

export interface CallParticipant {
  userId: number;
  displayName: string;
  media: CallParticipantMedia;
}

export interface CallPresence {
  channelId: string;
  type: "audio" | "video";
  startedAt: string;
  participants: CallParticipant[];
}

// ----------------------------------------------------------------
// Floating window types
// ----------------------------------------------------------------

export interface FloatingPosition {
  x: number;
  y: number;
}

export type FloatingWindowState = 'expanded' | 'collapsed';

// ----------------------------------------------------------------
// Store
// ----------------------------------------------------------------

interface CallState {
  /** Active calls the user can see (for sidebar indicators), keyed by channelId */
  activeCallsByChannel: Record<string, CallPresence>;

  /** Current user's active call (null if not in one) */
  currentCall: {
    channelId: string;
  } | null;

  /** Local media state — what the user is broadcasting */
  localMedia: CallParticipantMedia;

  /** Maps producerId → userId for video tile association */
  producerUserMap: Record<string, number>;

  /** Floating call window position (null = default bottom-right) */
  floatingPosition: FloatingPosition | null;

  /** Floating call window state */
  floatingWindowState: FloatingWindowState;

  // Actions driven by socket events
  handleCallStarted: (call: CallPresence) => void;
  handleCallEnded: (channelId: string) => void;
  handleParticipantJoined: (
    channelId: string,
    participant: CallParticipant,
  ) => void;
  handleParticipantLeft: (channelId: string, userId: number) => void;
  handleMediaChanged: (
    channelId: string,
    userId: number,
    media: CallParticipantMedia,
  ) => void;
  handleBulkCallState: (calls: CallPresence[], queriedChannelIds?: string[]) => void;

  // Producer → userId mapping
  setProducerUser: (producerId: string, userId: number) => void;
  removeProducer: (producerId: string) => void;

  // User actions
  setCurrentCall: (channelId: string | null) => void;
  setLocalMedia: (media: Partial<CallParticipantMedia>) => void;

  // Floating window actions
  setFloatingPosition: (pos: FloatingPosition) => void;
  setFloatingWindowState: (state: FloatingWindowState) => void;

  /** Clear workspace-specific state (calls map, producers) but preserve currentCall & media */
  resetForWorkspaceSwitch: () => void;

  reset: () => void;
}

const initialLocalMedia: CallParticipantMedia = {
  audio: false,
  video: false,
  screen: false,
};

const useCallStore = create<CallState>((set) => ({
  activeCallsByChannel: {},
  currentCall: null,
  localMedia: { ...initialLocalMedia },
  producerUserMap: {},
  floatingPosition: null,
  floatingWindowState: 'expanded' as FloatingWindowState,

  handleCallStarted: (call) =>
    set((state) => ({
      activeCallsByChannel: {
        ...state.activeCallsByChannel,
        [call.channelId]: call,
      },
    })),

  handleCallEnded: (channelId) =>
    set((state) => {
      const next = { ...state.activeCallsByChannel };
      delete next[channelId];
      return {
        activeCallsByChannel: next,
        // If user was in this call, clear it
        currentCall:
          state.currentCall?.channelId === channelId
            ? null
            : state.currentCall,
        localMedia:
          state.currentCall?.channelId === channelId
            ? { ...initialLocalMedia }
            : state.localMedia,
      };
    }),

  handleParticipantJoined: (channelId, participant) =>
    set((state) => {
      const existing = state.activeCallsByChannel[channelId];
      if (!existing) return state;

      const alreadyIn = existing.participants.some(
        (p) => p.userId === participant.userId,
      );
      if (alreadyIn) return state;

      return {
        activeCallsByChannel: {
          ...state.activeCallsByChannel,
          [channelId]: {
            ...existing,
            participants: [...existing.participants, participant],
          },
        },
      };
    }),

  handleParticipantLeft: (channelId, userId) =>
    set((state) => {
      const existing = state.activeCallsByChannel[channelId];
      if (!existing) return state;

      // Clean up producerUserMap entries for the leaving user
      const nextProducerUserMap = { ...state.producerUserMap };
      for (const [producerId, uid] of Object.entries(nextProducerUserMap)) {
        if (uid === userId) {
          delete nextProducerUserMap[producerId];
        }
      }

      return {
        activeCallsByChannel: {
          ...state.activeCallsByChannel,
          [channelId]: {
            ...existing,
            participants: existing.participants.filter(
              (p) => p.userId !== userId,
            ),
          },
        },
        producerUserMap: nextProducerUserMap,
      };
    }),

  handleMediaChanged: (channelId, userId, media) =>
    set((state) => {
      const existing = state.activeCallsByChannel[channelId];
      if (!existing) return state;

      return {
        activeCallsByChannel: {
          ...state.activeCallsByChannel,
          [channelId]: {
            ...existing,
            participants: existing.participants.map((p) =>
              p.userId === userId ? { ...p, media } : p,
            ),
          },
        },
      };
    }),

  handleBulkCallState: (calls, queriedChannelIds) =>
    set((state) => {
      const map = { ...state.activeCallsByChannel };
      // Remove stale entries for channels that were queried but have no active call
      if (queriedChannelIds) {
        const activeChannelIds = new Set(calls.map((c) => c.channelId));
        for (const id of queriedChannelIds) {
          if (!activeChannelIds.has(id)) {
            delete map[id];
          }
        }
      }
      for (const call of calls) {
        map[call.channelId] = call;
      }
      return { activeCallsByChannel: map };
    }),

  setProducerUser: (producerId, userId) =>
    set((state) => ({
      producerUserMap: { ...state.producerUserMap, [producerId]: userId },
    })),

  removeProducer: (producerId) =>
    set((state) => {
      const next = { ...state.producerUserMap };
      delete next[producerId];
      return { producerUserMap: next };
    }),

  setCurrentCall: (channelId) =>
    set(() => ({
      currentCall: channelId ? { channelId } : null,
      localMedia: channelId ? { audio: false, video: false, screen: false } : { ...initialLocalMedia },
    })),

  setLocalMedia: (media) =>
    set((state) => ({
      localMedia: { ...state.localMedia, ...media },
    })),

  setFloatingPosition: (pos) =>
    set(() => ({ floatingPosition: pos })),

  setFloatingWindowState: (windowState) =>
    set(() => ({ floatingWindowState: windowState })),

  resetForWorkspaceSwitch: () =>
    set(() => ({
      activeCallsByChannel: {},
      producerUserMap: {},
    })),

  reset: () =>
    set(() => ({
      activeCallsByChannel: {},
      currentCall: null,
      localMedia: { ...initialLocalMedia },
      producerUserMap: {},
      floatingPosition: null,
      floatingWindowState: 'expanded' as FloatingWindowState,
    })),
}));

export default useCallStore;
