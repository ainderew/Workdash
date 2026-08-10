import { create } from "zustand";
import useUserStore from "@/common/store/useStore";

type StatusDefinition = {
    id: string;
    label: string;
    category: "SYSTEM" | "MANUAL" | "INTEGRATION";
    priority: number;
    icon: string | null;
    color: string;
    ttl: number | null;
};

type UserPresence = {
    statusId: string;
    label: string;
    color: string;
    icon: string | null;
    manualLock: boolean;
};

type LastSeenMap = Record<number, number>;

/**
 * Slack-style user-authored status. Kept in its own map rather than folded
 * into UserPresence so online/away/focus broadcasts can't clobber it.
 */
type CustomStatus = {
    emoji: string | null;
    text: string | null;
};

type CustomStatusMap = Record<number, CustomStatus>;

interface PresenceState {
    definitions: Record<string, StatusDefinition>;
    presenceMap: Record<number, UserPresence>;
    myStatus: UserPresence;
    lastSeenMap: LastSeenMap;
    customStatusMap: CustomStatusMap;

    setDefinitions: (defs: StatusDefinition[]) => void;
    setPresence: (userId: number, presence: UserPresence) => void;
    setMyStatus: (status: UserPresence) => void;
    bulkSetPresence: (
        entries: Array<{ userId: number } & UserPresence>,
    ) => void;
    setCustomStatus: (
        userId: number,
        customStatus: CustomStatus | null,
    ) => void;
    bulkSetCustomStatus: (
        entries: Array<{ userId: number; customStatus: CustomStatus | null }>,
    ) => void;
    getCustomStatus: (userId: number) => CustomStatus | null;
    getLastSeen: (userId: number) => number | null;
}

const DEFAULT_PRESENCE: UserPresence = {
    statusId: "offline",
    label: "Offline",
    color: "#71717a",
    icon: null,
    manualLock: false,
};

const LAST_SEEN_STORAGE_KEY = "wd:lastSeen";

function loadLastSeenFromStorage(): LastSeenMap {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
            return parsed as LastSeenMap;
        }
        return {};
    } catch {
        // Corrupted localStorage entry — start fresh.
        return {};
    }
}

function persistLastSeen(map: LastSeenMap): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            LAST_SEEN_STORAGE_KEY,
            JSON.stringify(map),
        );
    } catch {
        // Quota or privacy mode — degrade gracefully; in-memory map still works.
    }
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
    definitions: {},
    presenceMap: {},
    myStatus: DEFAULT_PRESENCE,
    lastSeenMap: loadLastSeenFromStorage(),
    customStatusMap: {},

    setDefinitions: (defs) =>
        set({
            definitions: Object.fromEntries(defs.map((d) => [d.id, d])),
        }),

    setPresence: (userId, presence) =>
        set((state) => {
            const prev = state.presenceMap[userId];
            const wasOnline = !!prev && prev.statusId !== "offline";
            const nowOffline = presence.statusId === "offline";
            let lastSeenMap = state.lastSeenMap;
            if (wasOnline && nowOffline) {
                lastSeenMap = { ...lastSeenMap, [userId]: Date.now() };
                persistLastSeen(lastSeenMap);
            }
            return {
                presenceMap: { ...state.presenceMap, [userId]: presence },
                lastSeenMap,
            };
        }),

    setMyStatus: (status) => set({ myStatus: status }),

    bulkSetPresence: (entries) =>
        set((state) => {
            const next = { ...state.presenceMap };
            let lastSeenMap = state.lastSeenMap;
            let lastSeenChanged = false;
            let updatedMyStatus: UserPresence | undefined;
            const currentUserId = useUserStore.getState().backendUser?.id;
            const now = Date.now();
            for (const entry of entries) {
                const { userId, ...presence } = entry;
                const prev = next[userId];
                const wasOnline = !!prev && prev.statusId !== "offline";
                const nowOffline = presence.statusId === "offline";
                if (wasOnline && nowOffline) {
                    if (!lastSeenChanged) {
                        lastSeenMap = { ...lastSeenMap };
                        lastSeenChanged = true;
                    }
                    lastSeenMap[userId] = now;
                }
                next[userId] = presence;
                if (
                    typeof currentUserId === "number" &&
                    userId === currentUserId
                ) {
                    updatedMyStatus = presence;
                }
            }
            if (lastSeenChanged) {
                persistLastSeen(lastSeenMap);
            }
            return {
                presenceMap: next,
                lastSeenMap,
                ...(updatedMyStatus ? { myStatus: updatedMyStatus } : {}),
            };
        }),

    setCustomStatus: (userId, customStatus) =>
        set((state) => {
            const isEmpty =
                !customStatus ||
                (!customStatus.emoji && !customStatus.text);
            if (isEmpty) {
                if (!(userId in state.customStatusMap)) return state;
                const next = { ...state.customStatusMap };
                delete next[userId];
                return { customStatusMap: next };
            }
            return {
                customStatusMap: {
                    ...state.customStatusMap,
                    [userId]: customStatus,
                },
            };
        }),

    bulkSetCustomStatus: (entries) =>
        set((state) => {
            if (entries.length === 0) return state;
            const next = { ...state.customStatusMap };
            for (const { userId, customStatus } of entries) {
                if (
                    !customStatus ||
                    (!customStatus.emoji && !customStatus.text)
                ) {
                    delete next[userId];
                    continue;
                }
                next[userId] = customStatus;
            }
            return { customStatusMap: next };
        }),

    getCustomStatus: (userId) => get().customStatusMap[userId] ?? null,

    getLastSeen: (userId) => get().lastSeenMap[userId] ?? null,
}));

export const DEFAULT_OFFLINE_PRESENCE = DEFAULT_PRESENCE;
export type {
    StatusDefinition,
    UserPresence,
    LastSeenMap,
    CustomStatus,
    CustomStatusMap,
};
