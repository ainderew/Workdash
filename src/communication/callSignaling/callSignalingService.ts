import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportService";
import useCallStore from "@/common/store/callStore";
import type {
  CallParticipant,
  CallParticipantMedia,
  CallPresence,
  CallPresenter,
  MiniCallState,
} from "@/common/store/callStore";
import { AudioChat } from "@/communication/audioChat/audioChat";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import { VideoChatViewer } from "@/communication/videoChat/videoChatViewer";
import { ScreenShareService } from "@/communication/screenShare/screenShare";
import { ScreenShareViewer } from "@/communication/screenShare/screenShareViewer";
import { logger } from "@/common/utils/logger";
import useFocusStore from "@/common/store/focusStore";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { getDeviceId } from "@/communication/callSignaling/deviceId";
import {
  initCallOwnershipChannel,
  broadcastCallOwnership,
  destroyCallOwnershipChannel,
  getTabId,
} from "@/communication/callSignaling/callOwnershipChannel";
import { CallEvents } from "@/types/callEvents";

// ----------------------------------------------------------------
// Types (server response shapes)
// ----------------------------------------------------------------

interface AckResponse<T = unknown> {
  ok?: boolean;
  error?: string;
  call?: T;
  calls?: T[];
}

interface WorkspaceCallSnapshotAck {
  ok?: boolean;
  error?: string;
  snapshot?: {
    byWorkspace: Record<string, MiniCallState[]>;
    dmCalls: Array<{
      directRoomId: string;
      participantCount: number;
      type: "audio" | "video";
    }>;
  };
}

// ----------------------------------------------------------------
// Sound helpers
// ----------------------------------------------------------------

const CALL_ACK_TIMEOUT_MS = 10_000;

function playCallSound(name: "join-call" | "end-call"): void {
  try {
    const audio = new Audio(`/assets/sounds/${name}.mp3`);
    audio.play().catch(() => {});
  } catch {
    // ignore — sound is non-critical
  }
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class CallSignalingService {
  private static instance: CallSignalingService | null = null;
  private socket: SocketIOClient.Socket;
  private listening = false;
  /** In-flight start/join promises by channelId — prevents duplicate setup */
  private pendingCallSetups = new Map<string, Promise<CallPresence | null>>();
  /** Workspace IDs the React layer last reported. Re-fetched on every reconnect. */
  private knownWorkspaceIds: string[] = [];
  private onConnectHandler = () => {
    this.registerSession();
    if (this.knownWorkspaceIds.length > 0) {
      void this.fetchActiveCallsForWorkspaces(this.knownWorkspaceIds);
    }
  };

  private constructor() {
    this.socket = MediaTransportService.getInstance().socket;
  }

  static getInstance(): CallSignalingService {
    if (!CallSignalingService.instance) {
      CallSignalingService.instance = new CallSignalingService();
    }
    return CallSignalingService.instance;
  }

  private getLocalUserId(): number | undefined {
    return useUserStore.getState().backendUser?.id;
  }

  // ----------------------------------------------------------------
  // Socket event listeners (register once)
  // ----------------------------------------------------------------

  setupListeners(): void {
    if (this.listening) return;
    this.listening = true;

    this.registerSession();

    // NOTE: while the socket is disconnected, activeCallsByWorkspace and
    // activeDmCallsByRoomId may go stale. We deliberately hold the last-known
    // state instead of clearing on disconnect — most blips are sub-second and
    // wiping would cause badges to flicker. onConnectHandler refetches a fresh
    // bulk snapshot, which restores correctness within one RTT of reconnect.
    this.socket.on("connect", this.onConnectHandler);

    initCallOwnershipChannel((msg) => {
      if (msg.type === "transfer-initiated" && msg.tabId !== getTabId()) {
        // no-op: placeholder for future cross-tab transfer handling
      }
    });

    const store = useCallStore.getState;

    this.socket.on(CallEvents.STARTED, (call: CallPresence) => {
      store().handleCallStarted(call);
    });

    this.socket.on(CallEvents.ENDED, ({ channelId }: { channelId: string }) => {
      const wasInCall = store().currentCall?.channelId === channelId;
      store().handleCallEnded(channelId);
      if (wasInCall) {
        VideoChatService.getInstance().stopVideoChat();
        ScreenShareService.getInstance().stopScreenShare();
        AudioChat.getInstance().stopMic();
        VideoChatViewer.getInstance().closeAllConsumers();
        ScreenShareViewer.getInstance().closeAllConsumers();
        AudioChat.getInstance().closeAllAudioConsumers();
        playCallSound("end-call");
      }
    });

    this.socket.on(
      CallEvents.PARTICIPANT_JOINED,
      ({
        channelId,
        participant,
      }: {
        channelId: string;
        participant: CallParticipant;
      }) => {
        store().handleParticipantJoined(channelId, participant);
      },
    );

    this.socket.on(
      CallEvents.PARTICIPANT_LEFT,
      ({ channelId, userId }: { channelId: string; userId: number }) => {
        // Capture display name BEFORE handleParticipantLeft removes the participant
        const call = store().activeCallsByChannel[channelId];
        const participant = call?.participants.find((p) => p.userId === userId);
        const displayName = participant?.displayName ?? "Someone";

        const ephemeralId = `ephemeral-call-left-${crypto.randomUUID()}`;
        useChatV2Store.getState().injectEphemeralMessage({
          id: ephemeralId,
          roomId: channelId,
          senderUserId: userId,
          clientMessageId: ephemeralId,
          content: `${displayName} left the call`,
          messageType: "SYSTEM",
          metadata: {
            eventType: "call_participant_left",
            displayName,
            ephemeral: true,
          },
          replyToMessageId: null,
          editedAt: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
          attachments: [],
        });

        const isInCall = store().currentCall?.channelId === channelId;
        store().handleParticipantLeft(channelId, userId);
        if (userId !== this.getLocalUserId()) {
          useFocusStore.getState().removeRemoteFocusMode(userId);
        }
        if (isInCall) {
          playCallSound("end-call");
        }
      },
    );

    this.socket.on(
      CallEvents.MEDIA_CHANGED,
      ({
        channelId,
        userId,
        media,
      }: {
        channelId: string;
        userId: number;
        media: CallParticipantMedia;
      }) => {
        store().handleMediaChanged(channelId, userId, media);
      },
    );

    this.socket.on(
      CallEvents.PRESENTER_CHANGED,
      ({
        channelId,
        presenter,
      }: {
        channelId: string;
        presenter: CallPresenter | null;
      }) => {
        // Only reflect presenter changes for the call we're actually in.
        if (store().currentCall?.channelId !== channelId) return;
        store().setPresenter(presenter);
      },
    );

    this.socket.on(
      CallEvents.OWNERSHIP_CHANGED,
      async (data: {
        channelId: string;
        newOwnerSocketId: string;
        userId: number;
      }) => {
        const isMe = data.newOwnerSocketId === this.socket.id;
        if (isMe) {
          const alreadySetUp =
            store().currentCall?.channelId === data.channelId &&
            store().isCallOwner;
          store().setCallOwnershipStatus(data.channelId, "owner");
          if (!alreadySetUp) {
            store().setCurrentCall(data.channelId);
            try {
              await AudioChat.getInstance().joinVoiceChat();
            } catch (err) {
              logger.error("Failed to set up media after ownership change:", err);
            }
            this.loadCallProducers();
            // Sync the current stage to this freshly-owning tab.
            void this.getCallState(data.channelId).then((call) => {
              if (store().currentCall?.channelId === data.channelId) {
                store().setPresenter(call?.presenter ?? null);
              }
            });
          }
          broadcastCallOwnership("call-claimed", data.channelId);
        } else {
          this.teardownCallMedia();
          store().setCallOwnershipStatus(data.channelId, "passive");
        }
      },
    );

    this.socket.on(
      CallEvents.OWNERSHIP_LOST,
      (data: { channelId: string; reason: string }) => {
        store().setCallOwnershipStatus(data.channelId, "rejoin-available");
        broadcastCallOwnership("call-lost", data.channelId);
      },
    );

    this.socket.on(
      CallEvents.OWNERSHIP_CLEARED,
      (data: { channelId: string; reason: string }) => {
        store().setCurrentCall(null);
        broadcastCallOwnership("call-released", data.channelId);
      },
    );

    this.socket.on(
      CallEvents.WORKSPACE_CALL_ACTIVE,
      (payload: {
        workspaceId: string;
        channels: MiniCallState[];
      }) => {
        store().applyWorkspaceCallActivity(payload);
      },
    );

    this.socket.on(
      CallEvents.DM_CALL_ACTIVE,
      (payload: {
        userId: number;
        directRoomId: string;
        participantCount: number;
        type: "audio" | "video";
        ended?: boolean;
      }) => {
        store().applyDmCallActivity(payload);
      },
    );
  }

  teardown(): void {
    if (!this.listening) return;
    this.socket.off(CallEvents.STARTED);
    this.socket.off(CallEvents.ENDED);
    this.socket.off(CallEvents.PARTICIPANT_JOINED);
    this.socket.off(CallEvents.PARTICIPANT_LEFT);
    this.socket.off(CallEvents.MEDIA_CHANGED);
    this.socket.off(CallEvents.PRESENTER_CHANGED);
    this.socket.off(CallEvents.OWNERSHIP_CHANGED);
    this.socket.off(CallEvents.OWNERSHIP_LOST);
    this.socket.off(CallEvents.OWNERSHIP_CLEARED);
    this.socket.off(CallEvents.WORKSPACE_CALL_ACTIVE);
    this.socket.off(CallEvents.DM_CALL_ACTIVE);
    this.socket.off("connect", this.onConnectHandler);
    destroyCallOwnershipChannel();
    this.listening = false;
  }

  /**
   * Record the user's current workspace memberships so the service can
   * re-fetch a snapshot on socket reconnect. Called from React whenever
   * the workspace list changes.
   */
  setKnownWorkspaceIds(ids: string[]): void {
    this.knownWorkspaceIds = ids;
  }

  private registerSession(): void {
    const deviceId = getDeviceId();
    this.socket.emit(
      CallEvents.SESSION_REGISTER,
      { deviceId },
      (response: { ok?: boolean; error?: string; activeCall?: { channelId: string; isOwner: boolean } }) => {
        if (response.error) {
          logger.error("session:register failed:", response.error);
          return;
        }
        if (response.activeCall) {
          useCallStore.getState().setCallOwnershipStatus(
            response.activeCall.channelId,
            response.activeCall.isOwner ? "owner" : "passive",
          );
        } else {
          // Server says no active call — clear stale client state if present
          const { currentCall } = useCallStore.getState();
          if (currentCall) {
            logger.log("Clearing stale call state — server reports no active call");
            this.teardownCallMedia();
            useCallStore.getState().setCurrentCall(null);
            useCallStore.getState().clearCallOwnership();
          }
        }
      },
    );
  }

  /** Fetch and consume existing producers after joining a call */
  public loadCallProducers(): void {
    const mts = MediaTransportService.getInstance();
    if (mts.resetting || !mts.recvTransport || mts.recvTransport.closed) {
      logger.warn("loadCallProducers skipped — transport not ready");
      return;
    }
    Promise.all([
      AudioChat.getInstance().loadExistingProducers(),
      VideoChatViewer.getInstance().loadExistingProducers(),
      ScreenShareViewer.getInstance().loadExistingProducers(),
    ]).catch((err) => {
      logger.error("Failed to load existing producers after joining call:", err);
    });
  }

  private teardownCallMedia(): void {
    VideoChatService.getInstance().stopVideoChat();
    ScreenShareService.getInstance().stopScreenShare();
    AudioChat.getInstance().stopMic();
    VideoChatViewer.getInstance().closeAllConsumers();
    ScreenShareViewer.getInstance().closeAllConsumers();
    AudioChat.getInstance().closeAllAudioConsumers();
  }

  async transferCallToThisTab(
    channelId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const store = useCallStore.getState();
    const prevState = {
      currentCall: store.currentCall,
      localMedia: store.localMedia,
      callOwnershipStatus: store.callOwnershipStatus,
      isCallOwner: store.isCallOwner,
      ownershipChannelId: store.ownershipChannelId,
    };

    useCallStore.getState().setCurrentCall(channelId);

    return new Promise((resolve) => {
      let settled = false;

      const settle = () => {
        settled = true;
        clearTimeout(timeout);
        this.socket.off("disconnect", onDisconnect);
      };

      const fail = (error: string) => {
        if (settled) return;
        settle();
        useCallStore.setState(prevState);
        resolve({ success: false, error });
      };

      const onDisconnect = () => fail("Disconnected during transfer");
      const timeout = setTimeout(
        () => fail("Transfer request timed out"),
        CALL_ACK_TIMEOUT_MS,
      );
      this.socket.once("disconnect", onDisconnect);

      this.socket.emit(
        CallEvents.TRANSFER_REQUEST,
        { channelId },
        (res: AckResponse) => {
          if (settled) return;

          if (res.error) {
            fail(res.error);
            return;
          }

          settle();
          broadcastCallOwnership("call-claimed", channelId);
          resolve({ success: true });
        },
      );
    });
  }

  async rejoinCall(
    channelId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.transferCallToThisTab(channelId);
  }

  // ----------------------------------------------------------------
  // Emit helpers (request-response via ack callbacks)
  // ----------------------------------------------------------------

  startCall(
    channelId: string,
    type: "audio" | "video" = "audio",
  ): Promise<CallPresence | null> {
    return this.startOrJoinCall(CallEvents.START, channelId, {
      channelId,
      type,
    });
  }

  joinCall(channelId: string): Promise<CallPresence | null> {
    return this.startOrJoinCall(CallEvents.JOIN, channelId, { channelId });
  }

  /**
   * Shared start/join flow with per-channel in-flight dedup — a second call
   * while one is pending returns the same promise, so a double-click or a
   * reconnect-triggered retry can't acquire the mic and load producers twice.
   */
  private startOrJoinCall(
    event: typeof CallEvents.START | typeof CallEvents.JOIN,
    channelId: string,
    payload: Record<string, unknown>,
  ): Promise<CallPresence | null> {
    const pending = this.pendingCallSetups.get(channelId);
    if (pending) return pending;

    const setup = new Promise<CallPresence | null>((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        settled = true;
        reject(new Error(`${event} timed out`));
      }, CALL_ACK_TIMEOUT_MS);

      this.socket.emit(event, payload, async (res: AckResponse<CallPresence>) => {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;

        if (res.error) return reject(new Error(res.error));
        useCallStore.getState().setCurrentCallAsOwner(channelId);
        broadcastCallOwnership("call-claimed", channelId);
        playCallSound("join-call");
        try {
          await AudioChat.getInstance().joinVoiceChat();
        } catch (err) {
          logger.error("Failed to acquire mic when joining call:", err);
        }
        this.loadCallProducers();
        // Land on the stage immediately if a presenter is already set.
        useCallStore.getState().setPresenter(res.call?.presenter ?? null);
        resolve(res.call ?? null);
      });
    }).finally(() => {
      this.pendingCallSetups.delete(channelId);
    });

    this.pendingCallSetups.set(channelId, setup);
    return setup;
  }

  leaveCall(channelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        VideoChatService.getInstance().stopVideoChat();
        ScreenShareService.getInstance().stopScreenShare();
        AudioChat.getInstance().stopMic();
        VideoChatViewer.getInstance().closeAllConsumers();
        ScreenShareViewer.getInstance().closeAllConsumers();
        AudioChat.getInstance().closeAllAudioConsumers();
        useCallStore.getState().clearCallOwnership();
        useCallStore.getState().setCurrentCall(null);
        broadcastCallOwnership("call-released", channelId);
        playCallSound("end-call");
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("leaveCall timed out"));
      }, CALL_ACK_TIMEOUT_MS);

      this.socket.emit(
        CallEvents.LEAVE,
        { channelId },
        (res: AckResponse) => {
          clearTimeout(timeout);
          if (res.error) return reject(new Error(res.error));
          cleanup();
          resolve();
        },
      );
    });
  }

  getCallState(channelId: string): Promise<CallPresence | null> {
    return new Promise((resolve) => {
      this.socket.emit(
        CallEvents.GET_STATE,
        { channelId },
        (res: AckResponse<CallPresence>) => {
          resolve(res.call ?? null);
        },
      );
    });
  }

  setMedia(channelId: string, media: Partial<CallParticipantMedia>): void {
    useCallStore.getState().setLocalMedia(media);
    this.socket.emit(
      CallEvents.SET_MEDIA,
      { channelId, media },
      () => {},
    );
  }

  /**
   * Take or release the synced stage. `presenter: null` clears it (back to grid
   * for everyone). The server validates and broadcasts PRESENTER_CHANGED, which
   * updates every client (including this one), so we don't optimistically set
   * local state here — the round-trip is what keeps everyone in sync.
   */
  setPresenter(channelId: string, presenter: CallPresenter | null): void {
    this.socket.emit(
      CallEvents.SET_PRESENTER,
      { channelId, presenter },
      (res: AckResponse) => {
        if (res?.error) {
          logger.warn("setPresenter failed:", res.error);
        }
      },
    );
  }

  /** Fetch active calls for a set of channel IDs (e.g., on workspace join) */
  fetchActiveCallsForChannels(channelIds: string[]): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit(
        CallEvents.GET_ACTIVE,
        { channelIds },
        (res: AckResponse<CallPresence>) => {
          if (res.calls) {
            useCallStore
              .getState()
              .handleBulkCallState(res.calls, channelIds);
          }
          resolve();
        },
      );
    });
  }

  /**
   * Bulk snapshot of active calls across all of the user's workspaces + DMs.
   * Used on cold start and on socket reconnect to reconcile drift.
   */
  fetchActiveCallsForWorkspaces(workspaceIds: string[]): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit(
        CallEvents.GET_ACTIVE_FOR_WORKSPACES,
        { workspaceIds },
        (res: WorkspaceCallSnapshotAck) => {
          if (res.ok && res.snapshot) {
            useCallStore
              .getState()
              .applyBulkWorkspaceCallSnapshot(res.snapshot);
          } else if (res.error) {
            logger.warn("fetchActiveCallsForWorkspaces failed:", res.error);
          }
          resolve();
        },
      );
    });
  }
}
