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
  handleBulkCallState: (calls: CallPresence[]) => void;

  // Producer → userId mapping
  setProducerUser: (producerId: string, userId: number) => void;
  removeProducer: (producerId: string) => void;

  // User actions
  setCurrentCall: (channelId: string | null) => void;
  setLocalMedia: (media: Partial<CallParticipantMedia>) => void;
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

  handleBulkCallState: (calls) =>
    set(() => {
      const map: Record<string, CallPresence> = {};
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
      localMedia: channelId ? { audio: true, video: false, screen: false } : { ...initialLocalMedia },
    })),

  setLocalMedia: (media) =>
    set((state) => ({
      localMedia: { ...state.localMedia, ...media },
    })),

  reset: () =>
    set(() => ({
      activeCallsByChannel: {},
      currentCall: null,
      localMedia: { ...initialLocalMedia },
      producerUserMap: {},
    })),
}));

export default useCallStore;
