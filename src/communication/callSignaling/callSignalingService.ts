import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";
import useCallStore from "@/common/store/callStore";
import type { CallParticipant, CallParticipantMedia, CallPresence } from "@/common/store/callStore";
import { AudioChat } from "@/communication/audioChat/audioChat";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import { VideoChatViewer } from "@/communication/videoChat/videoChatViewer";
import { ScreenShareService } from "@/communication/screenShare/screenShare";
import { ScreenShareViewer } from "@/communication/screenShare/screenShareViewer";
import { logger } from "@/common/utils/logger";
import useFocusStore from "@/common/store/focusStore";

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

  private constructor() {
    this.socket = MediaTransportService.getInstance().socket;
  }

  static getInstance(): CallSignalingService {
    if (!CallSignalingService.instance) {
      CallSignalingService.instance = new CallSignalingService();
    }
    return CallSignalingService.instance;
  }

  // ----------------------------------------------------------------
  // Socket event listeners (register once)
  // ----------------------------------------------------------------

  setupListeners(): void {
    if (this.listening) return;
    this.listening = true;

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
        // Recreate mic producer so it's available for the next call join.
        AudioChat.getInstance().joinVoiceChat().catch((err) => {
            logger.error("Failed to recreate mic producer after call ended:", err);
        });
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
        useFocusStore.getState().removeRemoteFocusMode(userId);
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
  }

  teardown(): void {
    if (!this.listening) return;
    this.socket.off("call:started");
    this.socket.off("call:ended");
    this.socket.off("call:participant_joined");
    this.socket.off("call:participant_left");
    this.socket.off("call:media_changed");
    this.listening = false;
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
        (res: AckResponse<CallPresence>) => {
          if (res.error) return reject(new Error(res.error));
          useCallStore.getState().setCurrentCall(channelId);
          playCallSound("join-call");
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
        (res: AckResponse<CallPresence>) => {
          if (res.error) return reject(new Error(res.error));
          useCallStore.getState().setCurrentCall(channelId);
          playCallSound("join-call");
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
        // Recreate mic producer so it's available for the next call join.
        // joinVoiceChat() starts muted, matching the expected default state.
        AudioChat.getInstance().joinVoiceChat().catch((err) => {
            logger.error("Failed to recreate mic producer after leaving call:", err);
        });
        useCallStore.getState().setCurrentCall(null);
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
              .handleBulkCallState(res.calls as unknown as CallPresence[], channelIds);
          }
          resolve();
        },
      );
    });
  }
}
