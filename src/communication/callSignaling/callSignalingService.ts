import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportService";
import useCallStore from "@/common/store/callStore";
import type { CallParticipant, CallParticipantMedia, CallPresence } from "@/common/store/callStore";
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

// ----------------------------------------------------------------
// Sound helpers
// ----------------------------------------------------------------

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
  private onConnectHandler = () => {
    this.registerSession();
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
  }

  teardown(): void {
    if (!this.listening) return;
    this.socket.off(CallEvents.STARTED);
    this.socket.off(CallEvents.ENDED);
    this.socket.off(CallEvents.PARTICIPANT_JOINED);
    this.socket.off(CallEvents.PARTICIPANT_LEFT);
    this.socket.off(CallEvents.MEDIA_CHANGED);
    this.socket.off(CallEvents.OWNERSHIP_CHANGED);
    this.socket.off(CallEvents.OWNERSHIP_LOST);
    this.socket.off(CallEvents.OWNERSHIP_CLEARED);
    this.socket.off("connect", this.onConnectHandler);
    destroyCallOwnershipChannel();
    this.listening = false;
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
        }
      },
    );
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

      const rollback = () => {
        if (settled) return;
        settled = true;
        useCallStore.setState(prevState);
        resolve({ success: false, error: "Disconnected during transfer" });
      };
      this.socket.once("disconnect", rollback);

      this.socket.emit(
        CallEvents.TRANSFER_REQUEST,
        { channelId },
        (res: AckResponse) => {
          this.socket.off("disconnect", rollback);
          if (settled) return;
          settled = true;

          if (res.error) {
            useCallStore.setState(prevState);
            resolve({ success: false, error: res.error });
            return;
          }

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
    return new Promise((resolve, reject) => {
      this.socket.emit(
        CallEvents.START,
        { channelId, type },
        async (res: AckResponse<CallPresence>) => {
          if (res.error) return reject(new Error(res.error));
          useCallStore.getState().setCurrentCallAsOwner(channelId);
          broadcastCallOwnership("call-claimed", channelId);
          playCallSound("join-call");
          try {
            await AudioChat.getInstance().joinVoiceChat();
          } catch (err) {
            logger.error("Failed to acquire mic when starting call:", err);
          }
          resolve(res.call ?? null);
        },
      );
    });
  }

  joinCall(channelId: string): Promise<CallPresence | null> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        CallEvents.JOIN,
        { channelId },
        async (res: AckResponse<CallPresence>) => {
          if (res.error) return reject(new Error(res.error));
          useCallStore.getState().setCurrentCallAsOwner(channelId);
          broadcastCallOwnership("call-claimed", channelId);
          playCallSound("join-call");
          try {
            await AudioChat.getInstance().joinVoiceChat();
          } catch (err) {
            logger.error("Failed to acquire mic when joining call:", err);
          }
          resolve(res.call ?? null);
        },
      );
    });
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
      }, 10_000);

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
}
