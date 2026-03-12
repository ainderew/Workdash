import React, { useEffect, useState } from "react";
import useMusicStore from "@/common/store/musicStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { MusicClientService } from "@/communication/music/musicService";

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
    const isListening = useMusicStore((s) =>
        workspaceId ? s.listeningWorkspaces.has(workspaceId) : false,
    );
    const [lottieReady, setLottieReady] = useState(
        !!(musicBotAnimationData && LottieComponent),
    );

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

    return (
        <div className="wd-bg-panel wd-neo-shadow-top flex flex-col justify-center items-center gap-0.5 px-3 py-2 select-none">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
                {lottieReady && LottieComponent && musicBotAnimationData ? (
                    <div className="w-18 h-18 shrink-0">
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
                    <span className="text-[10px] wd-text-muted">
                        &middot; {session.queueLength} in queue
                    </span>
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
    );
}
