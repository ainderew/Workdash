import { create } from "zustand";
import useUserStore from "@/common/store/useStore";
import useCallReactionStore from "@/common/store/callReactionStore";

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

export type CallOwnershipStatus = "owner" | "passive" | "rejoin-available";

/** Who is "on stage" in a synced presenter-mode call, and which of their streams. */
export interface CallPresenter {
  userId: number;
  source: "camera" | "screen";
}

export interface CallPresence {
  channelId: string;
  type: "audio" | "video";
  startedAt: string;
  participants: CallParticipant[];
  /** Current synced presenter (null/absent = grid mode). */
  presenter?: CallPresenter | null;
}

/**
 * Minimal call snapshot used to power the workspace rail badge.
 * Lives in the cross-workspace maps below — survives workspace switches.
 */
export interface MiniCallState {
  channelId: string;
  participantCount: number;
  type: "audio" | "video";
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

/**
 * Health of the local WebRTC transports (ICE/DTLS), independent of the
 * socket.io signaling channel. When ICE drops while the socket stays alive the
 * call silently freezes — this surfaces that and drives the reconnect banner.
 */
export type MediaConnectionState = 'connected' | 'reconnecting' | 'lost';

export interface StatsSnapshot {
  bitrate: number;
  /** Combined inbound loss % (kept for back-compat / overall display) */
  packetLoss: number;
  /** Inbound audio loss % — broken out so choppy audio isn't masked by video */
  audioPacketLoss: number;
  /** Inbound video loss % */
  videoPacketLoss: number;
  rtt: number;
  fps: number;
}

interface CallState {
  /** Active calls the user can see (for sidebar indicators), keyed by channelId */
  activeCallsByChannel: Record<string, CallPresence>;

  /**
   * Mini call state per workspace — keyed by workspaceId then channelId.
   * Survives workspace switches (not cleared in resetForWorkspaceSwitch).
   * Powers the cross-workspace rail badge in GuildRail.
   */
  activeCallsByWorkspace: Record<string, Record<string, MiniCallState>>;

  /**
   * DM call state — keyed by directRoomId. Survives workspace switches.
   * Powers the DM rail entry's call badge.
   */
  activeDmCallsByRoomId: Record<string, MiniCallState>;

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

  /** Whether fullscreen was auto-triggered by a remote screen share (so we can auto-exit) */
  screenShareAutoFullscreen: boolean;

  /**
   * Current synced presenter for the active call (null = grid mode).
   * Server-authoritative — set from GET_STATE on join and PRESENTER_CHANGED events.
   */
  presenter: CallPresenter | null;

  /**
   * Local per-viewer opt-out from stage layout. When a presenter is set, this
   * viewer falls back to grid without affecting anyone else. Reset whenever the
   * presenter changes so a new "take stage" re-engages everyone.
   */
  stageOptOut: boolean;

  /** WebRTC connection quality indicator (aggregate, local) */
  connectionQuality: ConnectionQuality;

  /** Latest WebRTC stats snapshot */
  statsSnapshot: StatsSnapshot | null;

  /** Transport (ICE/DTLS) health — drives the in-call reconnect banner */
  mediaConnectionState: MediaConnectionState;

  /** Per-participant connection quality, keyed by userId (remote peers only) */
  participantQuality: Record<number, ConnectionQuality>;

  isCallOwner: boolean;
  callOwnershipStatus: CallOwnershipStatus | null;
  ownershipChannelId: string | null;

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

  applyWorkspaceCallActivity: (payload: {
    workspaceId: string;
    channels: MiniCallState[];
  }) => void;

  applyDmCallActivity: (payload: {
    directRoomId: string;
    participantCount: number;
    type: "audio" | "video";
    ended?: boolean;
  }) => void;

  applyBulkWorkspaceCallSnapshot: (snapshot: {
    byWorkspace: Record<string, MiniCallState[]>;
    dmCalls: Array<{
      directRoomId: string;
      participantCount: number;
      type: "audio" | "video";
    }>;
  }) => void;

  /**
   * Drop one workspace's call entry — used when the user leaves/is removed
   * from a workspace so a stale badge doesn't linger after server events stop.
   */
  clearWorkspaceCallActivity: (workspaceId: string) => void;

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
  setScreenShareAutoFullscreen: (value: boolean) => void;

  // Presenter / stage actions
  setPresenter: (presenter: CallPresenter | null) => void;
  setStageOptOut: (value: boolean) => void;

  setCallOwnershipStatus: (channelId: string, status: CallOwnershipStatus) => void;
  setCurrentCallAsOwner: (channelId: string) => void;
  clearCallOwnership: () => void;

  // Quality stats
  setConnectionQuality: (q: ConnectionQuality) => void;
  setStatsSnapshot: (s: StatsSnapshot | null) => void;
  setMediaConnectionState: (s: MediaConnectionState) => void;
  setParticipantQuality: (q: Record<number, ConnectionQuality>) => void;

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
  activeCallsByWorkspace: {},
  activeDmCallsByRoomId: {},
  currentCall: null,
  localMedia: { ...initialLocalMedia },
  producerUserMap: {},
  userToProducerId: {},
  screenProducerUserMap: {},
  producerToConsumerMap: {},
  manualFloating: false,
  floatingPosition: null,
  floatingWindowState: 'expanded' satisfies FloatingWindowState,
  channelContentRect: null,
  pinnedTileKey: null,
  screenShareAutoFullscreen: false,
  presenter: null,
  stageOptOut: false,
  connectionQuality: 'unknown' satisfies ConnectionQuality,
  statsSnapshot: null,
  mediaConnectionState: 'connected' satisfies MediaConnectionState,
  participantQuality: {},
  isCallOwner: false,
  callOwnershipStatus: null,
  ownershipChannelId: null,

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
      const clearOwnership = state.ownershipChannelId === channelId;
      return {
        activeCallsByChannel: next,
        currentCall: wasInCall ? null : state.currentCall,
        localMedia: wasInCall ? { ...initialLocalMedia } : state.localMedia,
        pinnedTileKey: wasInCall ? null : state.pinnedTileKey,
        screenShareAutoFullscreen: wasInCall ? false : state.screenShareAutoFullscreen,
        presenter: wasInCall ? null : state.presenter,
        stageOptOut: wasInCall ? false : state.stageOptOut,
        participantQuality: wasInCall ? {} : state.participantQuality,
        mediaConnectionState: wasInCall
          ? ('connected' satisfies MediaConnectionState)
          : state.mediaConnectionState,
        ...(clearOwnership && {
          callOwnershipStatus: null,
          isCallOwner: false,
          ownershipChannelId: null,
        }),
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

  handleParticipantLeft: (channelId, userId) => {
    // Clear raise-hand for leaving participant (outside set() to avoid cross-store in setter)
    useCallReactionStore.getState().setHandRaised(userId, false);

    return set((state) => {
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
      const wasPinned =
        pinnedKey === String(userId) || pinnedKey === `${userId}-screen`;
      const unpinned = wasPinned ? null : pinnedKey;

      // Auto-exit fullscreen if leaving user's screen share triggered it
      let nextFloatingWindowState = state.floatingWindowState;
      let nextManualFloating = state.manualFloating;
      let nextScreenShareAutoFullscreen = state.screenShareAutoFullscreen;
      if (wasPinned && state.screenShareAutoFullscreen && nextFloatingWindowState === 'fullscreen') {
        nextFloatingWindowState = 'expanded';
        nextManualFloating = false;
        nextScreenShareAutoFullscreen = false;
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
        userToProducerId: nextUserToProducerId,
        screenProducerUserMap: nextScreenProducerUserMap,
        pinnedTileKey: unpinned,
        floatingWindowState: nextFloatingWindowState,
        manualFloating: nextManualFloating,
        screenShareAutoFullscreen: nextScreenShareAutoFullscreen,
        // Drop the stage if the presenter is the one leaving
        presenter: state.presenter?.userId === userId ? null : state.presenter,
        stageOptOut: state.presenter?.userId === userId ? false : state.stageOptOut,
      };
    });
  },

  handleMediaChanged: (channelId, userId, media) =>
    set((state) => {
      const existing = state.activeCallsByChannel[channelId];
      if (!existing) return state;

      const localUserId = useUserStore.getState().backendUser?.id;
      const isRemoteUser = userId !== localUserId;
      const isInThisCall = state.currentCall?.channelId === channelId;

      let nextPinned = state.pinnedTileKey;
      let nextFloatingWindowState = state.floatingWindowState;
      let nextManualFloating = state.manualFloating;
      let nextScreenShareAutoFullscreen = state.screenShareAutoFullscreen;

      // Auto-unpin if the pinned stream is no longer active
      if (nextPinned === `${userId}-screen` && !media.screen) {
        nextPinned = null;
        // Auto-exit fullscreen if it was auto-triggered by screen share
        if (state.screenShareAutoFullscreen && nextFloatingWindowState === 'fullscreen') {
          nextFloatingWindowState = 'expanded';
          nextManualFloating = false;
          nextScreenShareAutoFullscreen = false;
        }
      }
      if (nextPinned === String(userId) && !media.video) {
        nextPinned = null;
      }

      // Auto-pin + auto-fullscreen when a remote user starts screen sharing
      if (media.screen && isRemoteUser && isInThisCall) {
        nextPinned = `${userId}-screen`;
        nextFloatingWindowState = 'fullscreen';
        nextManualFloating = true;
        nextScreenShareAutoFullscreen = true;
      }

      // Drop the stage if the screen-presenter stopped sharing (server also
      // broadcasts this; clearing here avoids a blank stage for a round-trip).
      const presenterScreenGone =
        state.presenter?.source === 'screen' &&
        state.presenter.userId === userId &&
        !media.screen;
      const nextPresenter = presenterScreenGone ? null : state.presenter;

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
        floatingWindowState: nextFloatingWindowState,
        manualFloating: nextManualFloating,
        screenShareAutoFullscreen: nextScreenShareAutoFullscreen,
        presenter: nextPresenter,
        stageOptOut: presenterScreenGone ? false : state.stageOptOut,
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

  applyWorkspaceCallActivity: ({ workspaceId, channels }) =>
    set((state) => {
      if (!Array.isArray(channels) || channels.length === 0) {
        if (!(workspaceId in state.activeCallsByWorkspace)) return state;
        const next = { ...state.activeCallsByWorkspace };
        delete next[workspaceId];
        return { activeCallsByWorkspace: next };
      }
      const byChannel: Record<string, MiniCallState> = {};
      for (const c of channels) byChannel[c.channelId] = c;
      return {
        activeCallsByWorkspace: {
          ...state.activeCallsByWorkspace,
          [workspaceId]: byChannel,
        },
      };
    }),

  applyDmCallActivity: ({ directRoomId, participantCount, type, ended }) =>
    set((state) => {
      if (ended || participantCount === 0) {
        if (!(directRoomId in state.activeDmCallsByRoomId)) return state;
        const next = { ...state.activeDmCallsByRoomId };
        delete next[directRoomId];
        return { activeDmCallsByRoomId: next };
      }
      return {
        activeDmCallsByRoomId: {
          ...state.activeDmCallsByRoomId,
          [directRoomId]: { channelId: directRoomId, participantCount, type },
        },
      };
    }),

  applyBulkWorkspaceCallSnapshot: ({ byWorkspace, dmCalls }) =>
    set(() => {
      const nextWs: Record<string, Record<string, MiniCallState>> = {};
      for (const [wsId, channels] of Object.entries(byWorkspace)) {
        if (!Array.isArray(channels) || channels.length === 0) continue;
        const byChannel: Record<string, MiniCallState> = {};
        for (const c of channels) byChannel[c.channelId] = c;
        nextWs[wsId] = byChannel;
      }
      const nextDm: Record<string, MiniCallState> = {};
      for (const d of dmCalls) {
        nextDm[d.directRoomId] = {
          channelId: d.directRoomId,
          participantCount: d.participantCount,
          type: d.type,
        };
      }
      return {
        activeCallsByWorkspace: nextWs,
        activeDmCallsByRoomId: nextDm,
      };
    }),

  clearWorkspaceCallActivity: (workspaceId) =>
    set((state) => {
      if (!(workspaceId in state.activeCallsByWorkspace)) return state;
      const next = { ...state.activeCallsByWorkspace };
      delete next[workspaceId];
      return { activeCallsByWorkspace: next };
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
      ...(!channelId && {
        callOwnershipStatus: null,
        isCallOwner: false,
        ownershipChannelId: null,
        presenter: null,
        stageOptOut: false,
      }),
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

  setScreenShareAutoFullscreen: (value) =>
    set(() => ({ screenShareAutoFullscreen: value })),

  setPresenter: (presenter) =>
    // A presenter change always re-engages the stage for everyone (clears any
    // local opt-out from a previous presenter).
    set(() => ({ presenter, stageOptOut: false })),

  setStageOptOut: (value) =>
    set(() => ({ stageOptOut: value })),

  setCallOwnershipStatus: (channelId, status) =>
    set(() => ({
      callOwnershipStatus: status,
      isCallOwner: status === "owner",
      ownershipChannelId: channelId,
    })),

  setCurrentCallAsOwner: (channelId) =>
    set(() => ({
      currentCall: { channelId },
      localMedia: { audio: false, video: false, screen: false },
      callOwnershipStatus: "owner" satisfies CallOwnershipStatus,
      isCallOwner: true,
      ownershipChannelId: channelId,
    })),

  clearCallOwnership: () =>
    set(() => ({
      callOwnershipStatus: null,
      isCallOwner: false,
      ownershipChannelId: null,
    })),

  setConnectionQuality: (q) =>
    set(() => ({ connectionQuality: q })),

  setStatsSnapshot: (s) =>
    set(() => ({ statsSnapshot: s })),

  setMediaConnectionState: (s) =>
    set(() => ({ mediaConnectionState: s })),

  setParticipantQuality: (q) =>
    set(() => ({ participantQuality: q })),

  resetForWorkspaceSwitch: () =>
    set(() => ({
      activeCallsByChannel: {},
      producerUserMap: {},
      userToProducerId: {},
      screenProducerUserMap: {},
      producerToConsumerMap: {},
      pinnedTileKey: null,
      screenShareAutoFullscreen: false,
      presenter: null,
      stageOptOut: false,
      participantQuality: {},
      isCallOwner: false,
      callOwnershipStatus: null,
      ownershipChannelId: null,
    })),

  reset: () =>
    set(() => ({
      activeCallsByChannel: {},
      activeCallsByWorkspace: {},
      activeDmCallsByRoomId: {},
      currentCall: null,
      localMedia: { ...initialLocalMedia },
      producerUserMap: {},
      userToProducerId: {},
      screenProducerUserMap: {},
      producerToConsumerMap: {},
      manualFloating: false,
      floatingPosition: null,
      floatingWindowState: 'expanded' satisfies FloatingWindowState,
      channelContentRect: null,
      pinnedTileKey: null,
      screenShareAutoFullscreen: false,
      presenter: null,
      stageOptOut: false,
      connectionQuality: 'unknown' satisfies ConnectionQuality,
      statsSnapshot: null,
      mediaConnectionState: 'connected' satisfies MediaConnectionState,
      participantQuality: {},
      isCallOwner: false,
      callOwnershipStatus: null,
      ownershipChannelId: null,
    })),
}));

/**
 * Aggregate call activity for a single workspace.
 * Subscribe to primitives derived from this (not the object itself) to avoid
 * re-renders triggered by Zustand's reference-equality check on new object literals.
 */
export function selectWorkspaceCallSummary(
  state: CallState,
  workspaceId: string,
): { totalParticipants: number; channelCount: number } {
  const channels = state.activeCallsByWorkspace[workspaceId];
  if (!channels) return { totalParticipants: 0, channelCount: 0 };
  let totalParticipants = 0;
  let channelCount = 0;
  for (const c of Object.values(channels)) {
    totalParticipants += c.participantCount;
    channelCount += 1;
  }
  return { totalParticipants, channelCount };
}

/** Aggregate DM-rail call activity (across all of the user's DMs). */
export function selectDmCallSummary(
  state: CallState,
): { totalParticipants: number; callCount: number } {
  let totalParticipants = 0;
  let callCount = 0;
  for (const c of Object.values(state.activeDmCallsByRoomId)) {
    totalParticipants += c.participantCount;
    callCount += 1;
  }
  return { totalParticipants, callCount };
}

export default useCallStore;
