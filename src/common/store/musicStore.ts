import { create } from "zustand";

interface MusicTrackInfo {
    title: string;
    duration?: number;
    requestedBy: string;
}

interface MusicSessionState {
    state: "playing" | "paused" | "stopped";
    currentTrack: MusicTrackInfo | null;
    queueLength: number;
    volume: number;
    listenerCount: number;
}

interface MusicState {
    sessionsByWorkspace: Record<string, MusicSessionState>;
    listeningWorkspaces: Set<string>;

    setSession: (workspaceId: string, session: MusicSessionState) => void;
    removeSession: (workspaceId: string) => void;
    getSession: (workspaceId: string) => MusicSessionState | null;
    setListening: (workspaceId: string, listening: boolean) => void;
    isListening: (workspaceId: string) => boolean;
}

const useMusicStore = create<MusicState>((set, get) => ({
    sessionsByWorkspace: {},
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
            const nextListening = new Set(state.listeningWorkspaces);
            nextListening.delete(workspaceId);
            return { sessionsByWorkspace: next, listeningWorkspaces: nextListening };
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
}));

export default useMusicStore;
