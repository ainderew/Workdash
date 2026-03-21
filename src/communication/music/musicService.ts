/**
 * Client-side singleton that listens for music session events
 * from the SFU server and updates the musicStore.
 */

import useMusicStore from "@/common/store/musicStore";

interface MusicStatePayload {
    workspaceId: string;
    state: "playing" | "paused" | "stopped";
    currentTrack: { title: string; duration?: number; requestedBy: string } | null;
    queueLength: number;
    volume: number;
    listenerCount: number;
    elapsedSeconds?: number;
}

interface MusicTrackPayload {
    workspaceId: string;
    track: { title: string; duration?: number; requestedBy: string };
}

interface MusicEndPayload {
    workspaceId: string;
}

interface ListenerUpdatePayload {
    workspaceId: string;
    listenerCount: number;
}

export class MusicClientService {
    private static instance: MusicClientService | null = null;
    private socket: SocketIOClient.Socket | null = null;
    private listening = false;

    private constructor() {}

    static getInstance(): MusicClientService {
        if (!this.instance) {
            this.instance = new MusicClientService();
        }
        return this.instance;
    }

    init(socket: SocketIOClient.Socket): MusicClientService {
        this.socket = socket;
        return this;
    }

    setupListeners(): void {
        if (this.listening || !this.socket) return;
        this.listening = true;

        this.socket.on("music:state-changed", (data: MusicStatePayload) => {
            useMusicStore.getState().setSession(data.workspaceId, {
                state: data.state,
                currentTrack: data.currentTrack,
                queueLength: data.queueLength,
                volume: data.volume,
                listenerCount: data.listenerCount,
                elapsedSeconds: data.elapsedSeconds,
            });
        });

        this.socket.on("music:track-started", (data: MusicTrackPayload) => {
            const current = useMusicStore.getState().getSession(data.workspaceId);
            useMusicStore.getState().setSession(data.workspaceId, {
                ...(current ?? { state: "playing", queueLength: 0, volume: 80, listenerCount: 0 }),
                state: "playing",
                currentTrack: data.track,
            });
        });

        this.socket.on("music:session-ended", (data: MusicEndPayload) => {
            useMusicStore.getState().removeSession(data.workspaceId);
        });

        this.socket.on("music:subscribed", (data: { workspaceId: string }) => {
            useMusicStore.getState().setListening(data.workspaceId, true);
        });

        this.socket.on("reconnect", () => {
            this.resubscribeAll();
        });

        this.socket.on("music:queue-updated", (data: { workspaceId: string; queue: Array<{ title: string; duration: number; requestedBy: string }> }) => {
            useMusicStore.getState().setQueue(data.workspaceId, data.queue);
        });

        this.socket.on("music:listener-update", (data: ListenerUpdatePayload) => {
            const current = useMusicStore.getState().getSession(data.workspaceId);
            if (current) {
                useMusicStore.getState().setSession(data.workspaceId, {
                    ...current,
                    listenerCount: data.listenerCount,
                });
            }
        });
    }

    /** Request current music session state from the server (e.g. after
     *  joining a workspace room). Populates musicStore so the NowPlayingBar
     *  can render without waiting for a state-change broadcast. */
    fetchState(workspaceId: string): void {
        if (!this.socket) return;
        this.socket.emit(
            "music:get-state",
            { workspaceId },
            (res: { ok?: boolean; data?: Omit<MusicStatePayload, 'workspaceId'> | null; error?: string }) => {
                if (!res.ok || !res.data) return;
                useMusicStore.getState().setSession(workspaceId, {
                    state: res.data.state,
                    currentTrack: res.data.currentTrack,
                    queueLength: res.data.queueLength,
                    volume: res.data.volume,
                    listenerCount: res.data.listenerCount,
                    elapsedSeconds: res.data.elapsedSeconds,
                });
            },
        );
    }

    subscribe(workspaceId: string): void {
        if (!this.socket) return;
        this.socket.emit(
            "music:subscribe",
            { workspaceId },
            (res: { producerId?: string; error?: string }) => {
                if (res.error) {
                    // "No active music session" is expected when auto-join
                    // probes a workspace — don't log it as an error.
                    if (!res.error.includes("No active music session")) {
                        console.error("[music] Subscribe failed:", res.error);
                    }
                    return;
                }
                useMusicStore.getState().setListening(workspaceId, true);
            },
        );
    }

    fetchQueue(workspaceId: string): void {
        if (!this.socket) return;
        this.socket.emit(
            "music:get-queue",
            { workspaceId },
            (res: { ok?: boolean; data?: Array<{ title: string; duration: number; requestedBy: string }>; error?: string }) => {
                if (!res.ok || !res.data) return;
                useMusicStore.getState().setQueue(workspaceId, res.data);
            },
        );
    }

    togglePlayback(workspaceId: string): void {
        if (!this.socket) return;
        this.socket.emit(
            "music:toggle-playback",
            { workspaceId },
            (res: { ok?: boolean; state?: string; error?: string }) => {
                if (res.error) {
                    console.error("[music] Toggle playback failed:", res.error);
                }
            },
        );
    }

    skip(workspaceId: string): void {
        if (!this.socket) return;
        this.socket.emit(
            "music:skip",
            { workspaceId },
            (res: { ok?: boolean; error?: string }) => {
                if (res.error) {
                    console.error("[music] Skip failed:", res.error);
                }
            },
        );
    }

    unsubscribe(workspaceId: string): void {
        if (!this.socket) return;
        this.socket.emit(
            "music:unsubscribe",
            { workspaceId },
            (res: { ok?: boolean; error?: string }) => {
                if (res.error) {
                    console.error("[music] Unsubscribe failed:", res.error);
                    return;
                }
                useMusicStore.getState().setListening(workspaceId, false);
            },
        );
    }

    /** Re-subscribe to any workspaces we were listening to (e.g. after socket reconnect) */
    resubscribeAll(): void {
        const { listeningWorkspaces } = useMusicStore.getState();
        for (const wsId of listeningWorkspaces) {
            this.subscribe(wsId);
        }
    }
}
