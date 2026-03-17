import { create } from "zustand";
import type { UserActivity } from "@/communication/activity/_types";

interface ActivityState {
  activityMap: Record<string, Record<number, UserActivity>>;
  setActivity: (wsId: string, userId: number, activity: UserActivity) => void;
  clearActivity: (wsId: string, userId: number) => void;
  batchSetActivities: (
    wsId: string,
    entries: Array<{ userId: number; activity: UserActivity }>,
  ) => void;
  batchClearActivities: (wsId: string, userIds: number[]) => void;
  clearWorkspace: (wsId: string) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activityMap: {},

  setActivity: (wsId, userId, activity) =>
    set((state) => ({
      activityMap: {
        ...state.activityMap,
        [wsId]: { ...state.activityMap[wsId], [userId]: activity },
      },
    })),

  clearActivity: (wsId, userId) =>
    set((state) => {
      const wsMap = state.activityMap[wsId];
      if (!wsMap) return state;
      const { [userId]: _removed, ...rest } = wsMap;
      void _removed;
      return { activityMap: { ...state.activityMap, [wsId]: rest } };
    }),

  batchSetActivities: (wsId, entries) =>
    set((state) => {
      const next = { ...state.activityMap[wsId] };
      for (const { userId, activity } of entries) {
        next[userId] = activity;
      }
      return { activityMap: { ...state.activityMap, [wsId]: next } };
    }),

  batchClearActivities: (wsId, userIds) =>
    set((state) => {
      const wsMap = state.activityMap[wsId];
      if (!wsMap) return state;
      const next = { ...wsMap };
      for (const uid of userIds) {
        delete next[uid];
      }
      return { activityMap: { ...state.activityMap, [wsId]: next } };
    }),

  clearWorkspace: (wsId) =>
    set((state) => {
      const { [wsId]: _removed, ...rest } = state.activityMap;
      void _removed;
      return { activityMap: rest };
    }),
}));
