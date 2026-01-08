"use-client";
import Phaser from "phaser";
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import AudioElement from "./common/components/AudioElement";
import UiControls from "./common/components/UiControls/UiControls";
import useUserStore from "./common/store/useStore";
import { User, UserStore } from "./common/store/_types";
import { MediaTransportService } from "./communication/mediaTransportService/mediaTransportServive";
import ScreenShareUi from "./common/components/ScreenShare/ScreenShareUi";
import VideoChatUi from "./common/components/VideoChat/VideoChatUi";
import { TextChatService } from "./communication/textChat/textChat";
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
// import { VideoChatService } from "./communication/videoChat/videoChat";
// import { ScreenShareService } from "./communication/screenShare/screenShare";
// import SplashScreen from "./common/components/Splash/SplashScreen";
// import { ScreenShareViewer } from "./communication/screenShare/screenShareViewer";
// import { VideoChatViewer } from "./communication/videoChat/videoChatViewer";

function App() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isGameReady, setIsGameReady] = useState(false);
    const { data: session, status } = useSession();

    useCommandPaletteHotkey();

    useEffect(() => {
        if (status !== "authenticated" || !session?.backendJwt) {
            return;
        }

        const jwtToken = session.backendJwt || window.__BACKEND_JWT__ || "";

        const transport = MediaTransportService.getInstance(jwtToken);
        const textChat = TextChatService.getInstance();
        const reactionService = ReactionService.getInstance();
        const pollService = PollService.getInstance();

        // const screenShareViewer = ScreenShareViewer.getInstance();
        // const videoChatViewer = VideoChatViewer.getInstance();
        // const screenShare = ScreenShareService.getInstance();
        // const videoChat = VideoChatService.getInstance();

        const init = async () => {
            try {
                await transport.connect();
                await transport.initializeSfu();

                textChat.setupMessageListener();
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

    // Callback when game finishes loading and is ready
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

    // if (!user.name) return <SplashScreen />;

    // Wait for session to load before initializing game
    if (status === "loading") {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-white">
                Loading session...
            </div>
        );
    }

    // Check if user is authenticated
    if (status === "unauthenticated") {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-white">
                Please log in to continue
            </div>
        );
    }

    if (!isInitialized) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-white">
                <div className="text-center">
                    <div className="text-cyan-400 font-mono text-sm mb-2">
                        Initializing services...
                    </div>
                    <div className="text-slate-500 text-xs">
                        Check console for details
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            id="app"
            className="w-full h-full grow flex flex-col items-center justify-end bg-black relative"
        >
            <PhaserGame
                ref={phaserRef}
                currentActiveScene={currentScene}
                user={user}
                onGameReady={handleGameReady}
            />
            <AudioElement />
            <UiControls />

            {/* Pass isGameReady to control when to load producers */}
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
