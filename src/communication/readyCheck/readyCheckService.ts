import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportService";
import useReadyCheckStore from "@/common/store/readyCheckStore";
import useFocusStore from "@/common/store/focusStore";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { ReadyCheckEvents } from "@/types/readyCheckEvents";
import { logger } from "@/common/utils/logger";
import { playSummonChime } from "./readyCheckSound";
import type {
  ReadyCheckPromptPayload,
  ReadyCheckSnapshot,
} from "./_types";

function playPromptSound(): void {
  try {
    playSummonChime();
  } catch {
    // ignore — sound is non-critical
  }
}

export class ReadyCheckClientService {
  private static instance: ReadyCheckClientService | null = null;
  private socket: SocketIOClient.Socket;
  private listening = false;

  private onConnectHandler = () => {
    // Re-fetch active check for the current channel after reconnect.
    const currentRoomId = useChatV2Store.getState().currentRoomId;
    if (currentRoomId) {
      void this.fetchActive(currentRoomId);
    }
  };

  private constructor() {
    this.socket = MediaTransportService.getInstance().socket;
  }

  static getInstance(): ReadyCheckClientService {
    if (!ReadyCheckClientService.instance) {
      ReadyCheckClientService.instance = new ReadyCheckClientService();
    }
    return ReadyCheckClientService.instance;
  }

  private getLocalUserId(): number | undefined {
    return useUserStore.getState().backendUser?.id;
  }

  setupListeners(): void {
    if (this.listening) return;
    this.listening = true;

    const store = useReadyCheckStore.getState;

    this.socket.on(
      ReadyCheckEvents.ACTIVE,
      (snapshot: ReadyCheckSnapshot) => {
        store().applySnapshot(snapshot);
      },
    );

    this.socket.on(
      ReadyCheckEvents.RESOLVED,
      (snapshot: ReadyCheckSnapshot) => {
        store().applySnapshot(snapshot);
      },
    );

    this.socket.on(
      ReadyCheckEvents.PROMPT,
      (payload: ReadyCheckPromptPayload) => {
        // Defense-in-depth: server should already skip focused users, but if
        // focus flipped on between the server snapshot and event delivery,
        // honour the client's current state.
        if (useFocusStore.getState().localFocusMode) {
          logger.log("ready-check:prompt ignored — local focus mode is on");
          return;
        }
        store().setActivePromptCheckId(payload.checkId);
        playPromptSound();
      },
    );

    this.socket.on("connect", this.onConnectHandler);
  }

  teardown(): void {
    if (!this.listening) return;
    this.socket.off(ReadyCheckEvents.ACTIVE);
    this.socket.off(ReadyCheckEvents.RESOLVED);
    this.socket.off(ReadyCheckEvents.PROMPT);
    this.socket.off("connect", this.onConnectHandler);
    this.listening = false;
  }

  // ----------------------------------------------------------------
  // RPCs
  // ----------------------------------------------------------------

  respond(
    checkId: string,
    ready: boolean,
  ): Promise<{ ok: boolean; error?: string }> {
    // Optimistic local response — clears the modal right away.
    useReadyCheckStore
      .getState()
      .recordLocalResponse(checkId, ready ? "ready" : "not-ready");

    return new Promise((resolve) => {
      this.socket.emit(
        ReadyCheckEvents.RESPOND,
        { checkId, ready },
        (res: { ok?: boolean; error?: string }) => {
          if (res.error) {
            logger.warn("ready-check:respond rejected:", res.error);
          }
          resolve({ ok: res.ok ?? false, error: res.error });
        },
      );
    });
  }

  cancel(checkId: string): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        ReadyCheckEvents.CANCEL,
        { checkId },
        (res: { ok?: boolean; error?: string }) => {
          if (res.error) {
            logger.warn("ready-check:cancel rejected:", res.error);
          }
          resolve({ ok: res.ok ?? false, error: res.error });
        },
      );
    });
  }

  fetchActive(channelId: string): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit(
        ReadyCheckEvents.GET_ACTIVE,
        { channelId },
        (res: {
          ok?: boolean;
          snapshot?: ReadyCheckSnapshot | null;
          error?: string;
        }) => {
          if (res.error) {
            logger.warn("ready-check:get-active failed:", res.error);
            resolve();
            return;
          }
          if (res.snapshot) {
            const store = useReadyCheckStore.getState();
            store.applySnapshot(res.snapshot);

            // Reconnect / cold-start case: if the local user is still pending,
            // open the modal even though we missed the original PROMPT event.
            const localUserId = this.getLocalUserId();
            if (
              localUserId &&
              !res.snapshot.resolved &&
              !useFocusStore.getState().localFocusMode
            ) {
              const target = res.snapshot.targets.find(
                (t) => t.userId === localUserId,
              );
              if (target?.state === "pending") {
                store.setActivePromptCheckId(res.snapshot.checkId);
                playPromptSound();
              }
            }
          }
          resolve();
        },
      );
    });
  }
}
