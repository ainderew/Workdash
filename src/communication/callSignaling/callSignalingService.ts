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
import { getDeviceId } from "@/communication/callSignaling/deviceId";
import {
  initCallOwnershipChannel,
  broadcastCallOwnership,
  destroyCallOwnershipChannel,
  getTabId,
} from "@/communication/callSignaling/callOwnershipChannel";

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

    this.socket.on("call:started", (call: CallPresence) => {
      store().handleCallStarted(call);
    });

    this.socket.on("call:ended", ({ channelId }: { channelId: string }) => {
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
      "call:participant_joined",
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
      "call:participant_left",
      ({ channelId, userId }: { channelId: string; userId: number }) => {
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
      "call:media_changed",
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
      "call:ownership-changed",
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
      "call:ownership-lost",
      (data: { channelId: string; reason: string }) => {
        store().setCallOwnershipStatus(data.channelId, "rejoin-available");
        broadcastCallOwnership("call-lost", data.channelId);
      },
    );

    this.socket.on(
      "call:ownership-cleared",
      (data: { channelId: string; reason: string }) => {
        store().setCurrentCall(null);
        broadcastCallOwnership("call-released", data.channelId);
      },
    );
  }

  teardown(): void {
    if (!this.listening) return;
    this.socket.off("call:started");
    this.socket.off("call:ended");
    this.socket.off("call:participant_joined");
    this.socket.off("call:participant_left");
    this.socket.off("call:media_changed");
    this.socket.off("call:ownership-changed");
    this.socket.off("call:ownership-lost");
    this.socket.off("call:ownership-cleared");
    this.socket.off("connect", this.onConnectHandler);
    destroyCallOwnershipChannel();
    this.listening = false;
  }

  private registerSession(): void {
    const deviceId = getDeviceId();
    this.socket.emit(
      "session:register",
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
        "call:transfer-request",
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
        "call:start",
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
        "call:join",
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
        "call:leave",
        { channelId },
        (res: AckResponse) => {
          clearTimeout(timeout);
          cleanup();
          if (res.error) return reject(new Error(res.error));
          resolve();
        },
      );
    });
  }

  getCallState(channelId: string): Promise<CallPresence | null> {
    return new Promise((resolve) => {
      this.socket.emit(
        "call:get-state",
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
      "call:set-media",
      { channelId, media },
      () => {},
    );
  }

  /** Fetch active calls for a set of channel IDs (e.g., on workspace join) */
  fetchActiveCallsForChannels(channelIds: string[]): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit(
        "call:get-active",
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
