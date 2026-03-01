"use-client";
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
import { useCommandPaletteHotkey } from "./common/components/CommandPalette/useCommandPaletteHotkey";
import { PollService } from "./communication/poll/poll";
import PollDisplay from "./common/components/Poll/PollDisplay";
import PollNotification from "./common/components/Poll/PollNotification";
import SoccerScoreboard from "./common/components/Soccer/SoccerScoreboard";
import SkillsHud from "./common/components/Soccer/SkillsHud";
import SkillSelectionOverlay from "./common/components/Soccer/SkillSelectionOverlay";
import { SoccerGameControlButton } from "./common/components/SoccerGameControl/SoccerGameControlButton";
import PingDisplay from "./common/components/PingDisplay/PingDisplay";
import useUiStore, { InteractionMode } from "./common/store/uiStore";
import DeskLayout from "./common/components/DeskMode/DeskLayout";
import useThemeStore from "@/common/store/themeStore";

function App() {
    const interactionMode = useUiStore((state) => state.interactionMode);
    const setInteractionMode = useUiStore((state) => state.setInteractionMode);
    const bootstrapTheme = useThemeStore((state) => state.bootstrapTheme);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isGameReady, setIsGameReady] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();

    useCommandPaletteHotkey();

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

        const jwtToken = session.backendJwt || window.__BACKEND_JWT__ || "";

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
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user: User = JSON.parse(storedUser);
            setUser(user);
        }
    }, [setUser]);

    const user = useUserStore((state: UserStore) => state.user);

    useEffect(() => {
        const resolveModeFromStorage = (): InteractionMode | null => {
            const params = new URLSearchParams(window.location.search);
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
            <PhaserGame
                ref={phaserRef}
                currentActiveScene={currentScene}
                user={user}
                onGameReady={handleGameReady}
            />
            {interactionMode === "desk" && <DeskLayout />}
            <AudioElement />
            {interactionMode === "world" && <UiControls />}

            {}
            <ScreenShareUi isGameReady={isGameReady} />
            <VideoChatUi isGameReady={isGameReady} />

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
        </div>
    );
}

export default App;
