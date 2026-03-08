import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";
import useCallStore from "@/common/store/callStore";
import type { CallParticipant, CallParticipantMedia, CallPresence } from "@/common/store/callStore";

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
      store().handleCallEnded(channelId);
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
        store().handleParticipantLeft(channelId, userId);
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
          resolve(res.call ?? null);
        },
      );
    });
  }

  leaveCall(channelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "call:leave",
        { channelId },
        (res: AckResponse) => {
          if (res.error) return reject(new Error(res.error));
          useCallStore.getState().setCurrentCall(null);
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
              .handleBulkCallState(res.calls as unknown as CallPresence[]);
          }
          resolve();
        },
      );
    });
  }
}
