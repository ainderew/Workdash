import Phaser from "phaser";
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import AudioElement from "./common/components/AudioElement";
import UiControls from "./common/components/UiControls/UiControls";
import useUserStore from "./common/store/useStore";
import { User, UserStore } from "./common/store/_types";
import { MediaTransportService } from "./communication/mediaTransportService/mediaTransportService";
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
import { ReadyCheckClientService } from "./communication/readyCheck/readyCheckService";
import ReadyCheckOverlay from "./common/components/DeskMode/ReadyCheck/ReadyCheckOverlay";
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
import DevControlPanel from "./common/components/DevControlPanel/DevControlPanel";
import WorkspaceSelectorOverlay from "./common/components/WorkspaceSelector/WorkspaceSelectorOverlay";
import { SplashLoader } from "./common/components/Splash/SplashLoader";
import useWorkspaceStore from "@/common/store/workspaceStore";
import useCallStore from "@/common/store/callStore";
import useMusicStore from "@/common/store/musicStore";
import useThemeStore from "@/common/store/themeStore";
import { EventBus } from "@/game/EventBus";
import { useChatNotificationSound } from "@/common/hooks/useChatNotificationSound";
import { useAchievementListener } from "@/common/hooks/useAchievementListener";
import { useDeviceEnumeration } from "@/common/hooks/useDeviceEnumeration";
import { useActivityHeartbeat } from "@/common/hooks/useActivityHeartbeat";
import { useLoungeNudges } from "@/common/hooks/useLoungeNudges";
import { SoundboardService } from "./communication/soundboard/soundboardService";
import FloatingPassiveCallIndicator from "./common/components/DeskMode/FloatingPassiveCallIndicator";
import LoungeAutoJoinPill from "./common/components/DeskMode/LoungeAutoJoinPill";

function resolveModeFromStorage(): InteractionMode | null {
    const params = new URLSearchParams(window.location.search);

    // Force desk mode when an invite link is opened
    if (params.has("invite")) return "desk";

    const urlMode = params.get("mode");
    if (urlMode === "desk" || urlMode === "world") return urlMode;

    const storedMode = localStorage.getItem("workdash:interactionMode");
    if (storedMode === "desk" || storedMode === "world") return storedMode;

    return null;
}

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
    const [hasEverBeenWorldMode, setHasEverBeenWorldMode] = useState(() => {
        const resolved = resolveModeFromStorage();
        return resolved !== "desk"; // true for "world" or null (default is world)
    });
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const [isGameReady, setIsGameReady] = useState(false);
    const modeResolvedRef = useRef(false);
    const initInFlight = useRef(false);
    const { data: session, status } = useSession();
    const router = useRouter();

    useKeyboardShortcuts();
    useChatNotificationSound();
    useAchievementListener();
    useDeviceEnumeration();
    useActivityHeartbeat(isInitialized);
    useLoungeNudges();

    useEffect(() => {
        if (status !== "authenticated" || !session?.backendJwt) {
            return;
        }

        void bootstrapTheme();
    }, [bootstrapTheme, session?.backendJwt, status]);

    useEffect(() => {
        if (status !== "authenticated" || !session?.backendJwt) return;

        tokenStore.setJwt(session.backendJwt);
        if (session.backendUser) {
            tokenStore.setUser(session.backendUser);
            useUserStore.getState().setBackendUser(session.backendUser);
            if (session.backendUser.image) {
                useUserStore
                    .getState()
                    .updateUser({ image: session.backendUser.image });
            }
        }
        if (session.backendCharacter)
            tokenStore.setCharacter(session.backendCharacter);
    }, [status, session?.backendJwt, session?.backendUser, session?.backendCharacter]);

    const [initStep, setInitStep] = React.useState("");
    const [initProgress, setInitProgress] = React.useState(0);

    const initServices = React.useCallback(async (jwtToken: string) => {
        if (initInFlight.current) return;
        initInFlight.current = true;
        setInitError(null);

        const t0 = performance.now();
        let currentStep = "Creating transport";
        // Friendly, user-facing copy + boot progress (0..1) for the splash loader.
        // `techLabel` stays technical for the failure log.
        const step = (label: string, progress: number, techLabel: string) => {
            currentStep = techLabel;
            setInitStep(label);
            setInitProgress(progress);
        };
        const logStep = (label: string) => {
            console.info(`[init-timing] ${label}: ${(performance.now() - t0).toFixed(1)}ms`);
        };

        try {
            step("Getting the room ready…", 0.12, "Creating transport");
            const transport = MediaTransportService.getInstance(jwtToken);
            const reactionService = ReactionService.getInstance();
            const pollService = PollService.getInstance();

            step("Connecting…", 0.36, "Connecting to server");
            await transport.connect();
            logStep("socket connected");

            step("Tuning audio & video…", 0.66, "Initializing SFU");
            await transport.initializeSfu();
            logStep("SFU initialized");

            step("Almost in…", 0.9, "Setting up listeners");
            reactionService.setupReactionListener();
            reactionService.uiUpdater = (emojiData) => {
                reactionService.routeReactionToPlayer(emojiData);
            };

            pollService.setupPollListeners();

            const callService = CallSignalingService.getInstance();
            callService.setupListeners();

            ReadyCheckClientService.getInstance().setupListeners();

            WebrtcStatsService.getInstance().start();

            MusicClientService.getInstance()
                .init(transport.socket)
                .setupListeners();

            // Start listening for newProducer events (needed for music-bot
            // audio even when not in a call/huddle)
            AudioChat.getInstance().watchNewProducers();

            void getMusicBotAvatarDataUri();

            logStep("TOTAL initServices");
            setIsInitialized(true);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            console.error("Failed to initialize services:", error);
            logStep(`FAILED at step: ${currentStep}`);
            setInitError(message);
        } finally {
            initInFlight.current = false;
        }
    }, []);

    useEffect(() => {
        if (status !== "authenticated" || !session?.backendJwt) {
            return;
        }

        const jwtToken = session.backendJwt || tokenStore.getJwt();
        void initServices(jwtToken);

        return () => {
            SoundboardService.getInstance().cleanup();
        };
    }, [session?.backendJwt, status, initServices]);

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
        const resolvedMode = resolveModeFromStorage();
        if (resolvedMode) {
            setInteractionMode(resolvedMode);
        }
    }, [setInteractionMode]);

    useEffect(() => {
        if (!modeResolvedRef.current) {
            modeResolvedRef.current = true;
            return;
        }
        if (interactionMode === "world") {
            setHasEverBeenWorldMode(true);
        }
    }, [interactionMode]);

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

            // Auto-join the music by default; users can opt out via the flag.
            const autoJoin =
                localStorage.getItem('workdash:autoJoinMusic') !== 'false';
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
        return <SplashLoader step="Waking up…" progress={0.05} />;
    }

    if (status === "unauthenticated") {
        void router.replace("/login");
        return null;
    }

    if (!isInitialized) {
        return (
            <SplashLoader
                step={initStep || "Starting up…"}
                progress={initProgress}
                error={initError}
                onRetry={() => {
                    const jwt = session?.backendJwt || tokenStore.getJwt();
                    if (jwt) void initServices(jwt);
                }}
            />
        );
    }

    return (
        <div
            id="app"
            className="w-screen h-[100dvh] overflow-hidden flex flex-col items-center justify-end wd-bg-app relative"
        >
            {selectedWorkspaceId && hasEverBeenWorldMode && (
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
            {interactionMode === "world" && (
                <FloatingPassiveCallIndicator />
            )}

            <LoungeAutoJoinPill />

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
            <DevControlPanel />
            <ReadyCheckOverlay />
        </div>
    );
}

export default App;
