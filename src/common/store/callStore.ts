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

export type FloatingWindowState = 'expanded' | 'collapsed' | 'fullscreen';

export interface ChannelContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ----------------------------------------------------------------
// Store
// ----------------------------------------------------------------

export type ConnectionQuality = 'good' | 'fair' | 'poor' | 'unknown';

export interface StatsSnapshot {
  bitrate: number;
  packetLoss: number;
  rtt: number;
  fps: number;
}

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

  /** Reverse: userId → producerId for O(1) tile lookups */
  userToProducerId: Record<number, string>;

  /** Maps screen-share producerId → userId for screen share tile association */
  screenProducerUserMap: Record<string, number>;

  /** Maps producerId → consumerId for adaptive layer switching */
  producerToConsumerMap: Record<string, string>;

  /** User manually triggered floating PiP while on the call's channel */
  manualFloating: boolean;

  /** Floating call window position (null = default bottom-right) */
  floatingPosition: FloatingPosition | null;

  /** Floating call window state */
  floatingWindowState: FloatingWindowState;

  /** Channel content area bounds for fullscreen mode */
  channelContentRect: ChannelContentRect | null;

  /** Pinned tile key — e.g. "42" for camera, "42-screen" for screen share (null = no pin) */
  pinnedTileKey: string | null;

  /** WebRTC connection quality indicator */
  connectionQuality: ConnectionQuality;

  /** Latest WebRTC stats snapshot */
  statsSnapshot: StatsSnapshot | null;

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

  // Screen producer → userId mapping
  setScreenProducerUser: (producerId: string, userId: number) => void;
  removeScreenProducer: (producerId: string) => void;

  // Producer → Consumer mapping (for adaptive layers)
  setProducerConsumer: (producerId: string, consumerId: string) => void;
  removeProducerConsumer: (producerId: string) => void;

  // User actions
  setCurrentCall: (channelId: string | null) => void;
  setLocalMedia: (media: Partial<CallParticipantMedia>) => void;

  // Floating window actions
  setManualFloating: (value: boolean) => void;
  setFloatingPosition: (pos: FloatingPosition) => void;
  setFloatingWindowState: (state: FloatingWindowState) => void;
  setChannelContentRect: (rect: ChannelContentRect | null) => void;

  // Pin actions
  setPinnedTileKey: (key: string | null) => void;

  // Quality stats
  setConnectionQuality: (q: ConnectionQuality) => void;
  setStatsSnapshot: (s: StatsSnapshot | null) => void;

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
  userToProducerId: {},
  screenProducerUserMap: {},
  producerToConsumerMap: {},
  manualFloating: false,
  floatingPosition: null,
  floatingWindowState: 'expanded' as FloatingWindowState,
  channelContentRect: null,
  pinnedTileKey: null,
  connectionQuality: 'unknown' as ConnectionQuality,
  statsSnapshot: null,

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
      const wasInCall = state.currentCall?.channelId === channelId;
      return {
        activeCallsByChannel: next,
        currentCall: wasInCall ? null : state.currentCall,
        localMedia: wasInCall ? { ...initialLocalMedia } : state.localMedia,
        pinnedTileKey: wasInCall ? null : state.pinnedTileKey,
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
      const nextUserToProducerId = { ...state.userToProducerId };
      for (const [producerId, uid] of Object.entries(nextProducerUserMap)) {
        if (uid === userId) {
          delete nextProducerUserMap[producerId];
        }
      }
      delete nextUserToProducerId[userId];

      // Clean up screenProducerUserMap entries for the leaving user
      const nextScreenProducerUserMap = { ...state.screenProducerUserMap };
      for (const [producerId, uid] of Object.entries(nextScreenProducerUserMap)) {
        if (uid === userId) {
          delete nextScreenProducerUserMap[producerId];
        }
      }

      // Clear pin if the leaving user was pinned
      const pinnedKey = state.pinnedTileKey;
      const unpinned =
        pinnedKey === String(userId) || pinnedKey === `${userId}-screen`
          ? null
          : pinnedKey;

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
        userToProducerId: nextUserToProducerId,
        screenProducerUserMap: nextScreenProducerUserMap,
        pinnedTileKey: unpinned,
      };
    }),

  handleMediaChanged: (channelId, userId, media) =>
    set((state) => {
      const existing = state.activeCallsByChannel[channelId];
      if (!existing) return state;

      // Auto-unpin if the pinned stream is no longer active
      let nextPinned = state.pinnedTileKey;
      if (nextPinned === `${userId}-screen` && !media.screen) {
        nextPinned = null;
      }
      if (nextPinned === String(userId) && !media.video) {
        nextPinned = null;
      }

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
        pinnedTileKey: nextPinned,
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
      userToProducerId: { ...state.userToProducerId, [userId]: producerId },
    })),

  removeProducer: (producerId) =>
    set((state) => {
      const userId = state.producerUserMap[producerId];
      const next = { ...state.producerUserMap };
      delete next[producerId];
      const nextReverse = { ...state.userToProducerId };
      if (userId !== undefined && nextReverse[userId] === producerId) {
        delete nextReverse[userId];
      }
      return { producerUserMap: next, userToProducerId: nextReverse };
    }),

  setScreenProducerUser: (producerId, userId) =>
    set((state) => ({
      screenProducerUserMap: { ...state.screenProducerUserMap, [producerId]: userId },
    })),

  removeScreenProducer: (producerId) =>
    set((state) => {
      const next = { ...state.screenProducerUserMap };
      delete next[producerId];
      return { screenProducerUserMap: next };
    }),

  setProducerConsumer: (producerId, consumerId) =>
    set((state) => ({
      producerToConsumerMap: { ...state.producerToConsumerMap, [producerId]: consumerId },
    })),

  removeProducerConsumer: (producerId) =>
    set((state) => {
      const next = { ...state.producerToConsumerMap };
      delete next[producerId];
      return { producerToConsumerMap: next };
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

  setManualFloating: (value) =>
    set(() => ({ manualFloating: value })),

  setFloatingPosition: (pos) =>
    set(() => ({ floatingPosition: pos })),

  setFloatingWindowState: (windowState) =>
    set(() => ({ floatingWindowState: windowState })),

  setChannelContentRect: (rect) =>
    set(() => ({ channelContentRect: rect })),

  setPinnedTileKey: (key) =>
    set(() => ({ pinnedTileKey: key })),

  setConnectionQuality: (q) =>
    set(() => ({ connectionQuality: q })),

  setStatsSnapshot: (s) =>
    set(() => ({ statsSnapshot: s })),

  resetForWorkspaceSwitch: () =>
    set(() => ({
      activeCallsByChannel: {},
      producerUserMap: {},
      userToProducerId: {},
      screenProducerUserMap: {},
      producerToConsumerMap: {},
      pinnedTileKey: null,
    })),

  reset: () =>
    set(() => ({
      activeCallsByChannel: {},
      currentCall: null,
      localMedia: { ...initialLocalMedia },
      producerUserMap: {},
      userToProducerId: {},
      screenProducerUserMap: {},
      producerToConsumerMap: {},
      manualFloating: false,
      floatingPosition: null,
      floatingWindowState: 'expanded' as FloatingWindowState,
      channelContentRect: null,
      pinnedTileKey: null,
      connectionQuality: 'unknown' as ConnectionQuality,
      statsSnapshot: null,
    })),
}));

export default useCallStore;
