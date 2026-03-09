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

interface PresenceState {
    definitions: Record<string, StatusDefinition>;
    presenceMap: Record<number, UserPresence>;
    myStatus: UserPresence;

    setDefinitions: (defs: StatusDefinition[]) => void;
    setPresence: (userId: number, presence: UserPresence) => void;
    setMyStatus: (status: UserPresence) => void;
    bulkSetPresence: (
        entries: Array<{ userId: number } & UserPresence>,
    ) => void;
}

const DEFAULT_PRESENCE: UserPresence = {
    statusId: "offline",
    label: "Offline",
    color: "#71717a",
    icon: null,
    manualLock: false,
};

export const usePresenceStore = create<PresenceState>((set) => ({
    definitions: {},
    presenceMap: {},
    myStatus: DEFAULT_PRESENCE,

    setDefinitions: (defs) =>
        set({
            definitions: Object.fromEntries(defs.map((d) => [d.id, d])),
        }),

    setPresence: (userId, presence) =>
        set((state) => ({
            presenceMap: { ...state.presenceMap, [userId]: presence },
        })),

    setMyStatus: (status) => set({ myStatus: status }),

    bulkSetPresence: (entries) =>
        set((state) => {
            const next = { ...state.presenceMap };
            let updatedMyStatus: UserPresence | undefined;
            const currentUserId = useUserStore.getState().backendUser?.id;
            for (const entry of entries) {
                const { userId, ...presence } = entry;
                next[userId] = presence;
                if (
                    typeof currentUserId === "number" &&
                    userId === currentUserId
                ) {
                    updatedMyStatus = presence;
                }
            }
            return {
                presenceMap: next,
                ...(updatedMyStatus ? { myStatus: updatedMyStatus } : {}),
            };
        }),
}));

export const DEFAULT_OFFLINE_PRESENCE = DEFAULT_PRESENCE;
export type { StatusDefinition, UserPresence };
