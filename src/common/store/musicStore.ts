import { create } from "zustand";

interface MusicTrackInfo {
    title: string;
    duration?: number;
    requestedBy: string;
}

export interface QueuedTrack {
    title: string;
    duration: number;
    requestedBy: string;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface MusicSessionState {
    state: "playing" | "paused" | "stopped";
    currentTrack: MusicTrackInfo | null;
    queueLength: number;
    volume: number;
    listenerCount: number;
    /** Server-reported elapsed seconds for the current track. */
    elapsedSeconds?: number;
    shuffle: boolean;
    repeatMode: RepeatMode;
}

interface MusicState {
    sessionsByWorkspace: Record<string, MusicSessionState>;
    queuesByWorkspace: Record<string, QueuedTrack[]>;
    listeningWorkspaces: Set<string>;

    setSession: (workspaceId: string, session: MusicSessionState) => void;
    removeSession: (workspaceId: string) => void;
    getSession: (workspaceId: string) => MusicSessionState | null;
    setListening: (workspaceId: string, listening: boolean) => void;
    isListening: (workspaceId: string) => boolean;
    setQueue: (workspaceId: string, queue: QueuedTrack[]) => void;
    reorderQueue: (workspaceId: string, fromIndex: number, toIndex: number) => void;
    clearQueue: (workspaceId: string) => void;
}

const useMusicStore = create<MusicState>((set, get) => ({
    sessionsByWorkspace: {},
    queuesByWorkspace: {},
    listeningWorkspaces: new Set(),

    setSession: (workspaceId, session) => {
        set((state) => ({
            sessionsByWorkspace: {
                ...state.sessionsByWorkspace,
                [workspaceId]: session,
            },
        }));
    },

    removeSession: (workspaceId) => {
        set((state) => {
            const next = { ...state.sessionsByWorkspace };
            delete next[workspaceId];
            const nextQueues = { ...state.queuesByWorkspace };
            delete nextQueues[workspaceId];
            const nextListening = new Set(state.listeningWorkspaces);
            nextListening.delete(workspaceId);
            return {
                sessionsByWorkspace: next,
                queuesByWorkspace: nextQueues,
                listeningWorkspaces: nextListening,
            };
        });
    },

    getSession: (workspaceId) => {
        return get().sessionsByWorkspace[workspaceId] ?? null;
    },

    setListening: (workspaceId, listening) => {
        set((state) => {
            const next = new Set(state.listeningWorkspaces);
            if (listening) {
                next.add(workspaceId);
            } else {
                next.delete(workspaceId);
            }
            return { listeningWorkspaces: next };
        });
    },

    isListening: (workspaceId) => {
        return get().listeningWorkspaces.has(workspaceId);
    },

    setQueue: (workspaceId, queue) => {
        set((state) => ({
            queuesByWorkspace: {
                ...state.queuesByWorkspace,
                [workspaceId]: queue,
            },
        }));
    },

    reorderQueue: (workspaceId, fromIndex, toIndex) => {
        set((state) => {
            const queue = state.queuesByWorkspace[workspaceId];
            if (!queue) return state;
            const updated = [...queue];
            const [moved] = updated.splice(fromIndex, 1);
            if (!moved) return state;
            updated.splice(toIndex, 0, moved);
            return {
                queuesByWorkspace: {
                    ...state.queuesByWorkspace,
                    [workspaceId]: updated,
                },
            };
        });
    },

    clearQueue: (workspaceId) => {
        set((state) => {
            const next = { ...state.queuesByWorkspace };
            delete next[workspaceId];
            return { queuesByWorkspace: next };
        });
    },
}));

export default useMusicStore;
