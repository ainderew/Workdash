import Phaser from "phaser";
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import AudioElement from "./common/components/AudioElement";
import UiControls from "./common/components/UiControls/UiControls";
import useUserStore from "./common/store/useStore";
import { User, UserStore } from "./common/store/_types";
import { MediaTransportService } from "./communication/mediaTransportService/mediaTransportServive";
import ScreenShareUi from "./common/components/ScreenShare/ScreenShareUi";
import VideoChatUi from "./common/components/VideoChat/VideoChatUi";
import { ReactionService } from "./communication/reaction/reaction";
import ReactionToast from "./common/components/RaiseHandToast/RaiseHandToast";
import { CharacterCustomizationButton } from "./common/components/UiControls/CharacterCustomizationButton";
import CommandPalette from "./common/components/CommandPalette/CommandPalette";
import { useKeyboardShortcuts } from "@/common/keyboard";
import { PollService } from "./communication/poll/poll";
import PollDisplay from "./common/components/Poll/PollDisplay";
import { CallSignalingService } from "./communication/callSignaling/callSignalingService";
import { WebrtcStatsService } from "./communication/webrtcStats/webrtcStatsService";
import { getMusicBotAvatarDataUri } from "@/common/utils/botAvatar";
import { MusicClientService } from "./communication/music/musicService";
import { AudioChat } from "./communication/audioChat/audioChat";
import { tokenStore } from "./common/utils/tokenStore";
import PollNotification from "./common/components/Poll/PollNotification";
import SoccerScoreboard from "./common/components/Soccer/SoccerScoreboard";
import SkillsHud from "./common/components/Soccer/SkillsHud";
import SkillSelectionOverlay from "./common/components/Soccer/SkillSelectionOverlay";
import { SoccerGameControlButton } from "./common/components/SoccerGameControl/SoccerGameControlButton";
import PingDisplay from "./common/components/PingDisplay/PingDisplay";
import useUiStore, { InteractionMode } from "./common/store/uiStore";
import useChatV2Store from "./common/store/chatV2Store";
import DeskLayout from "./common/components/DeskMode/DeskLayout";
import WorkspaceSelectorOverlay from "./common/components/WorkspaceSelector/WorkspaceSelectorOverlay";
import useWorkspaceStore from "@/common/store/workspaceStore";
import useCallStore from "@/common/store/callStore";
import useMusicStore from "@/common/store/musicStore";
import useThemeStore from "@/common/store/themeStore";
import { EventBus } from "@/game/EventBus";
import { useChatNotificationSound } from "@/common/hooks/useChatNotificationSound";
import { useAchievementListener } from "@/common/hooks/useAchievementListener";
import { useDeviceEnumeration } from "@/common/hooks/useDeviceEnumeration";

function App() {
    const interactionMode = useUiStore((state) => state.interactionMode);
    const setInteractionMode = useUiStore((state) => state.setInteractionMode);
    const showWorkspaceSelector = useUiStore(
        (state) => state.showWorkspaceSelector,
    );
    const bootstrapTheme = useThemeStore((state) => state.bootstrapTheme);
    const selectedWorkspaceId = useChatV2Store(
        (state) => state.selectedWorkspaceId,
    );
    const currentCall = useCallStore((state) => state.currentCall);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isGameReady, setIsGameReady] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();

    useKeyboardShortcuts();
    useChatNotificationSound();
    useAchievementListener();
    useDeviceEnumeration();

    useEffect(() => {
        if (status !== "authenticated" || !session?.backendJwt) {
            return;
        }

        void bootstrapTheme();
    }, [bootstrapTheme, session?.backendJwt, status]);

    useEffect(() => {
        if (status !== "authenticated" || !session?.backendJwt) {
            return;
        }

        const jwtToken = session.backendJwt || tokenStore.getJwt();

        const transport = MediaTransportService.getInstance(jwtToken);
        const reactionService = ReactionService.getInstance();
        const pollService = PollService.getInstance();

        const init = async () => {
            try {
                await transport.connect();
                await transport.initializeSfu();

                reactionService.setupReactionListener();
                reactionService.uiUpdater = (emojiData) => {
                    reactionService.routeReactionToPlayer(emojiData);
                };

                pollService.setupPollListeners();

                const callService = CallSignalingService.getInstance();
                callService.setupListeners();

                WebrtcStatsService.getInstance().start();

                MusicClientService.getInstance()
                    .init(transport.socket)
                    .setupListeners();

                // Start listening for newProducer events (needed for music-bot
                // audio even when not in a call/huddle)
                AudioChat.getInstance().watchNewProducers();

                void getMusicBotAvatarDataUri();

                setIsInitialized(true);
            } catch (error) {
                console.error("Failed to initialize services:", error);
            }
        };

        init();
    }, [session, status]);

    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const currentScene = (scene: Phaser.Scene) => {
        if (scene.scene.key === "Game") {
            return true;
        }
        return false;
    };

    const handleGameReady = () => {
        setIsGameReady(true);
    };

    const setUser = useUserStore((state: UserStore) => state.setUser);
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const user: User = JSON.parse(storedUser);
                setUser(user);
            }
        } catch {
            localStorage.removeItem("user");
        }
    }, [setUser]);

    const user = useUserStore((state: UserStore) => state.user);

    useEffect(() => {
        const resolveModeFromStorage = (): InteractionMode | null => {
            const params = new URLSearchParams(window.location.search);

            // Force desk mode when an invite link is opened
            if (params.has("invite")) return "desk";

            const urlMode = params.get("mode");
            if (urlMode === "desk" || urlMode === "world") return urlMode;

            const storedMode = localStorage.getItem("workdash:interactionMode");
            if (storedMode === "desk" || storedMode === "world")
                return storedMode;

            return null;
        };

        const resolvedMode = resolveModeFromStorage();
        if (resolvedMode) {
            setInteractionMode(resolvedMode);
        }
    }, [setInteractionMode]);

    useEffect(() => {
        localStorage.setItem("workdash:interactionMode", interactionMode);

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("mode", interactionMode);
        window.history.replaceState({}, "", currentUrl.toString());
    }, [interactionMode]);

    useEffect(() => {
        const game = phaserRef.current?.game;
        if (!game?.loop) return;

        if (interactionMode === "desk") {
            game.loop.sleep();
            return;
        }

        game.loop.wake();
    }, [interactionMode, isGameReady]);

    // Open workspace selector on first load if no workspace is selected
    const openWorkspaceSelector = useUiStore(
        (state) => state.openWorkspaceSelector,
    );
    const fetchMyWorkspaces = useWorkspaceStore(
        (state) => state.fetchMyWorkspaces,
    );
    useEffect(() => {
        if (!isInitialized) return;

        const resolveWorkspace = async () => {
            // Always fetch workspace list first to validate membership
            await fetchMyWorkspaces();
            const workspaces = useWorkspaceStore.getState().workspaces;

            const selectedId = useChatV2Store.getState().selectedWorkspaceId;
            if (selectedId && workspaces.some((ws) => ws.id === selectedId)) {
                return; // Already selected and valid
            }

            const storedDefault = localStorage.getItem('workdash:defaultWorkspaceId');
            if (storedDefault && workspaces.some((ws) => ws.id === storedDefault)) {
                useChatV2Store.getState().setSelectedWorkspaceId(storedDefault);
                EventBus.emit('workspace-switch', { workspaceId: storedDefault });
                void useChatV2Store.getState().reloadRoomStructure().then(() => {
                    const roomId = useChatV2Store.getState().currentRoomId;
                    if (roomId) {
                        void useChatV2Store.getState().selectRoom(roomId);
                    }
                });
            } else {
                // Stale or missing — clear and show selector
                localStorage.removeItem('workdash:defaultWorkspaceId');
                openWorkspaceSelector();
            }
        };

        void resolveWorkspace();
    }, [isInitialized, openWorkspaceSelector, fetchMyWorkspaces]);

    // On workspace switch, fetch the current music session state from the
    // server so the NowPlayingBar can render immediately. The server doesn't
    // push music:state-changed to newly joined clients — only on state changes.
    // We delay 1s to let workspace:select complete (server rejects requests
    // until socketWorkspaces is set). If auto-join is enabled, also subscribe.
    useEffect(() => {
        const handler = ({ workspaceId }: { workspaceId: string }) => {
            const music = MusicClientService.getInstance();
            music.fetchState(workspaceId);

            const autoJoin = localStorage.getItem('workdash:autoJoinMusic') === 'true';
            if (autoJoin && !useMusicStore.getState().isListening(workspaceId)) {
                music.subscribe(workspaceId);
            }
        };

        EventBus.on('workspace-select-complete', handler);
        return () => {
            EventBus.off('workspace-select-complete', handler);
        };
    }, []);

    if (status === "loading") {
        return (
            <div className="w-full h-full flex items-center justify-center wd-bg-app wd-text-primary">
                Loading session...
            </div>
        );
    }

    if (status === "unauthenticated") {
        void router.replace("/login");
        return null;
    }

    if (!isInitialized) {
        return (
            <div className="w-full h-full flex items-center justify-center wd-bg-app wd-text-primary">
                <div className="text-center">
                    <div className="wd-text-accent font-mono text-sm mb-2">
                        Initializing services...
                    </div>
                    <div className="wd-text-muted text-xs">
                        Check console for details
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            id="app"
            className="w-screen h-[100dvh] overflow-hidden flex flex-col items-center justify-end wd-bg-app relative"
        >
            {selectedWorkspaceId && (
                <PhaserGame
                    ref={phaserRef}
                    currentActiveScene={currentScene}
                    user={user}
                    onGameReady={handleGameReady}
                />
            )}
            {interactionMode === "desk" && <DeskLayout />}
            <AudioElement />
            {interactionMode === "world" && !showWorkspaceSelector && (
                <UiControls />
            )}

            {}
            {!(interactionMode === "desk" && currentCall !== null) && (
                <ScreenShareUi isGameReady={isGameReady} />
            )}
            {interactionMode === "world" && (
                <VideoChatUi isGameReady={isGameReady} />
            )}

            <ReactionToast />
            <CharacterCustomizationButton />
            <CommandPalette />
            <PollDisplay />
            <PollNotification />
            <SoccerScoreboard />
            <SkillsHud />
            <SkillSelectionOverlay />
            <SoccerGameControlButton />
            <PingDisplay />
            <WorkspaceSelectorOverlay />
        </div>
    );
}

export default App;
