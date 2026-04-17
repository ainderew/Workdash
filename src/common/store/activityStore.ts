import { create } from "zustand";
import type { UserActivity } from "@/communication/activity/_types";

/** Activities for a single user, keyed by source (so music + dota can coexist). */
export type UserActivityRecord = Record<string, UserActivity>;

interface ActivityState {
    activityMap: Record<string, Record<number, UserActivityRecord>>;
    /** Upsert one activity (realtime path). Always wins vs hydration. */
    setActivity: (wsId: string, userId: number, activity: UserActivity) => void;
    clearActivity: (wsId: string, userId: number, source: string) => void;
    clearAllActivities: (wsId: string, userId: number) => void;
    batchSetActivities: (
        wsId: string,
        entries: Array<{ userId: number; activity: UserActivity }>,
    ) => void;
    /** Workspace bootstrap hydration. Replaces each listed user's record
     *  with the hydrated snapshot — the server is authoritative. A realtime
     *  event that lands between the hydration RTT and this call would be
     *  clobbered; that window is ~network latency and considered acceptable. */
    hydrateActivities: (
        wsId: string,
        entries: Array<{ userId: number; activities: UserActivity[] }>,
    ) => void;
    batchClearActivities: (
        wsId: string,
        userIds: number[],
        source: string,
    ) => void;
    clearWorkspace: (wsId: string) => void;
}

function upsert(
    record: UserActivityRecord | undefined,
    activity: UserActivity,
): UserActivityRecord {
    return { ...(record ?? {}), [activity.source]: activity };
}

function removeSource(
    record: UserActivityRecord | undefined,
    source: string,
): UserActivityRecord {
    if (!record) return {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [source]: _drop, ...rest } = record;
    return rest;
}

export const useActivityStore = create<ActivityState>((set) => ({
    activityMap: {},

    setActivity: (wsId, userId, activity) =>
        set((state) => {
            const wsMap = state.activityMap[wsId] ?? {};
            const existing = wsMap[userId]?.[activity.source];
            if (
                existing &&
                existing.type === activity.type &&
                existing.startedAt === activity.startedAt &&
                ("title" in existing && "title" in activity
                    ? existing.title === activity.title
                    : true)
            ) {
                return state;
            }
            return {
                activityMap: {
                    ...state.activityMap,
                    [wsId]: {
                        ...wsMap,
                        [userId]: upsert(wsMap[userId], activity),
                    },
                },
            };
        }),

    clearActivity: (wsId, userId, source) =>
        set((state) => {
            const wsMap = state.activityMap[wsId];
            if (!wsMap) return state;
            const userRecord = wsMap[userId];
            if (!userRecord) return state;
            const nextRecord = removeSource(userRecord, source);
            const nextWs = { ...wsMap };
            if (Object.keys(nextRecord).length === 0) {
                delete nextWs[userId];
            } else {
                nextWs[userId] = nextRecord;
            }
            return { activityMap: { ...state.activityMap, [wsId]: nextWs } };
        }),

    clearAllActivities: (wsId, userId) =>
        set((state) => {
            const wsMap = state.activityMap[wsId];
            if (!wsMap) return state;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [userId]: _drop, ...rest } = wsMap;
            return { activityMap: { ...state.activityMap, [wsId]: rest } };
        }),

    batchSetActivities: (wsId, entries) =>
        set((state) => {
            const wsMap = { ...(state.activityMap[wsId] ?? {}) };
            for (const { userId, activity } of entries) {
                wsMap[userId] = upsert(wsMap[userId], activity);
            }
            return { activityMap: { ...state.activityMap, [wsId]: wsMap } };
        }),

    hydrateActivities: (wsId, entries) =>
        set((state) => {
            const wsMap = { ...(state.activityMap[wsId] ?? {}) };
            for (const { userId, activities } of entries) {
                if (activities.length === 0) {
                    delete wsMap[userId];
                    continue;
                }
                const record: UserActivityRecord = {};
                for (const activity of activities) {
                    record[activity.source] = activity;
                }
                wsMap[userId] = record;
            }
            return { activityMap: { ...state.activityMap, [wsId]: wsMap } };
        }),

    batchClearActivities: (wsId, userIds, source) =>
        set((state) => {
            const wsMap = state.activityMap[wsId];
            if (!wsMap) return state;
            const nextWs = { ...wsMap };
            for (const uid of userIds) {
                const record = nextWs[uid];
                if (!record) continue;
                const nextRecord = removeSource(record, source);
                if (Object.keys(nextRecord).length === 0) {
                    delete nextWs[uid];
                } else {
                    nextWs[uid] = nextRecord;
                }
            }
            return { activityMap: { ...state.activityMap, [wsId]: nextWs } };
        }),

    clearWorkspace: (wsId) =>
        set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [wsId]: _drop, ...rest } = state.activityMap;
            return { activityMap: rest };
        }),
}));
