import React, { useEffect, useState } from "react";
import { ListMusic } from "lucide-react";
import useMusicStore from "@/common/store/musicStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { MusicClientService } from "@/communication/music/musicService";
import { QueuePanel } from "./QueuePanel";

const EMPTY_QUEUE: never[] = [];
let musicBotAnimationData: object | null = null;
let LottieComponent: React.ComponentType<{
    animationData: object;
    loop: boolean;
    autoplay: boolean;
    style?: React.CSSProperties;
}> | null = null;

export function NowPlayingBar() {
    const workspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const session = useMusicStore((s) =>
        workspaceId ? s.sessionsByWorkspace[workspaceId] : null,
    );
    const queue = useMusicStore((s) =>
        workspaceId
            ? (s.queuesByWorkspace[workspaceId] ?? EMPTY_QUEUE)
            : EMPTY_QUEUE,
    );
    const isListening = useMusicStore((s) =>
        workspaceId ? s.listeningWorkspaces.has(workspaceId) : false,
    );
    const [lottieReady, setLottieReady] = useState(
        !!(musicBotAnimationData && LottieComponent),
    );
    const [showQueue, setShowQueue] = useState(false);

    useEffect(() => {
        if (lottieReady) return;
        if (!session?.currentTrack) return;

        void Promise.all([
            import("lottie-react").then((m) => m.default),
            fetch("/assets/bot-avatars/musicbot.json").then((r) => r.json()),
        ]).then(([Lottie, data]) => {
            LottieComponent = Lottie;
            musicBotAnimationData = data as object;
            setLottieReady(true);
        });
    }, [lottieReady, session?.currentTrack]);

    // Collapse queue panel when session ends or workspace changes
    useEffect(() => {
        if (!session) setShowQueue(false);
    }, [session]);

    useEffect(() => {
        setShowQueue(false);
    }, [workspaceId]);

    if (!session || !session.currentTrack) return null;

    const stateIcon = session.state === "paused" ? "\u23F8" : "\u25B6";
    const stateLabel = session.state === "paused" ? "Paused" : "Playing";

    const handleToggleListen = () => {
        if (!workspaceId) return;
        const service = MusicClientService.getInstance();
        if (isListening) {
            service.unsubscribe(workspaceId);
        } else {
            service.subscribe(workspaceId);
        }
    };

    const handleToggleQueue = () => {
        if (!workspaceId) return;
        const next = !showQueue;
        if (next && !useMusicStore.getState().queuesByWorkspace[workspaceId]) {
            MusicClientService.getInstance().fetchQueue(workspaceId);
        }
        setShowQueue(next);
    };

    return (
        <div className="wd-bg-panel wd-neo-shadow-top flex flex-col items-center gap-0 select-none">
            {/* Collapsible Queue Panel */}
            <div
                className="w-full overflow-hidden transition-[max-height] duration-300 ease-in-out"
                style={{ maxHeight: showQueue ? "240px" : "0px" }}
            >
                <div className="border-b wd-border-subtle pt-2 pb-1">
                    <div className="flex items-center justify-between px-3 mb-1">
                        <span className="wd-text-muted text-[10px] uppercase tracking-widest font-semibold">
                            Up Next
                        </span>
                        <span className="wd-text-muted text-[10px]">
                            {session.queueLength} tracks
                        </span>
                    </div>
                    <div
                        className="overflow-y-auto no-scrollbar"
                        style={{ maxHeight: "196px" }}
                    >
                        <QueuePanel tracks={queue} />
                    </div>
                </div>
            </div>

            {/* Main NowPlayingBar body */}
            <div className="flex flex-col justify-center items-center gap-0.5 px-3 py-2 w-full">
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                    {lottieReady && LottieComponent && musicBotAnimationData ? (
                        <div className="w-20 h-20 shrink-0">
                            <LottieComponent
                                animationData={musicBotAnimationData}
                                loop
                                autoplay
                                style={{ width: "100%", height: "100%" }}
                            />
                        </div>
                    ) : (
                        <span className="wd-text-muted text-xs shrink-0">
                            {"\u266B"}
                        </span>
                    )}
                    <span className="wd-text-primary text-xs font-medium truncate text-wrap text-center">
                        {session.currentTrack.title}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] wd-text-muted">
                        {stateIcon} {stateLabel}
                    </span>
                    {session.listenerCount > 0 && (
                        <span className="text-[10px] wd-text-muted">
                            &middot; {session.listenerCount} listening
                        </span>
                    )}
                    {session.queueLength > 0 && (
                        <button
                            type="button"
                            onClick={handleToggleQueue}
                            className={`flex items-center gap-0.5 text-[10px] transition-colors rounded-sm px-0.5 -mx-0.5 cursor-pointer hover:text-[var(--wd-accent)] ${
                                showQueue
                                    ? "text-[var(--wd-accent)]"
                                    : "wd-text-muted hover:wd-text-secondary"
                            }`}
                            title={showQueue ? "Hide queue" : "Show queue"}
                        >
                            &middot;
                            <ListMusic size={10} strokeWidth={2} />
                            <span>{session.queueLength} in queue</span>
                        </button>
                    )}
                </div>
                <button
                    onClick={handleToggleListen}
                    className={`mt-0.5 px-5 py-0.5 text-[11px] font-normal rounded-sm transition-colors ${
                        isListening
                            ? "bg-[var(--wd-danger)] text-white hover:bg-[var(--wd-danger-hover,var(--wd-danger))]"
                            : "bg-[var(--wd-accent)] text-white"
                    }`}
                >
                    {isListening ? "Leave" : "Join"}
                </button>
            </div>
        </div>
    );
}
