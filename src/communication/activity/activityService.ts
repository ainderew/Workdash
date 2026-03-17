import { useActivityStore } from "@/common/store/activityStore";
import type { UserActivity } from "./_types";

export class ActivityClientService {
  private static instance: ActivityClientService | null = null;
  private socket: SocketIOClient.Socket | null = null;
  private listening = false;

  static getInstance(): ActivityClientService {
    if (!ActivityClientService.instance) {
      ActivityClientService.instance = new ActivityClientService();
    }
    return ActivityClientService.instance;
  }

  init(socket: SocketIOClient.Socket): ActivityClientService {
    this.socket = socket;
    return this;
  }

  setupListeners(): void {
    if (this.listening || !this.socket) return;
    this.listening = true;

    this.socket.on(
      "activity:update",
      (payload: {
        userId: number;
        workspaceId: string;
        activity: UserActivity;
      }) => {
        useActivityStore
          .getState()
          .setActivity(payload.workspaceId, payload.userId, payload.activity);
      },
    );

    this.socket.on(
      "activity:cleared",
      (payload: { userId: number; workspaceId: string }) => {
        useActivityStore
          .getState()
          .clearActivity(payload.workspaceId, payload.userId);
      },
    );

    this.socket.on(
      "activity:batch-update",
      (payload: {
        workspaceId: string;
        activities: Array<{ userId: number; activity: UserActivity }>;
      }) => {
        useActivityStore
          .getState()
          .batchSetActivities(payload.workspaceId, payload.activities);
      },
    );

    this.socket.on(
      "activity:batch-cleared",
      (payload: { workspaceId: string; userIds: number[] }) => {
        useActivityStore
          .getState()
          .batchClearActivities(payload.workspaceId, payload.userIds);
      },
    );
  }
}
