import React, { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import StartGame from "./game/main";
import { EventBus } from "./game/EventBus";
import { User } from "./common/store/_types";
import { BackendUser, BackendCharacter } from "./types/auth";
import { Multiplayer } from "./game/multiplayer/multiplayer";

declare global {
    interface Window {
        __BACKEND_JWT__?: string;
        __BACKEND_USER__?: BackendUser;
        __BACKEND_CHARACTER__?: BackendCharacter;
        __MULTIPLAYER__?: Multiplayer;
    }
}

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps {
    currentActiveScene?: (scene_instance: Phaser.Scene) => void;
    user: User;
    onGameReady?: () => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(
    function PhaserGame({ currentActiveScene, onGameReady }, ref) {
        const game = useRef<Phaser.Game | null>(null!);
        const { data: session } = useSession();

        useLayoutEffect(() => {
            if (session?.backendJwt) {
                window.__BACKEND_JWT__ = session.backendJwt;
                window.__BACKEND_USER__ = session.backendUser;
                window.__BACKEND_CHARACTER__ = session.backendCharacter;
            } else {
                console.warn("PhaserGame: No backendJwt in session yet");
            }

            if (game.current === null) {
                game.current = StartGame("game-container");

                if (typeof ref === "function") {
                    ref({ game: game.current, scene: null });
                } else if (ref) {
                    ref.current = { game: game.current, scene: null };
                }
            }

            return () => {
                if (game.current) {
                    game.current.destroy(true);
                    if (game.current !== null) {
                        game.current = null;
                    }
                }
            };
        }, [ref, session]);

        useEffect(() => {
            EventBus.on(
                "current-scene-ready",
                (scene_instance: Phaser.Scene) => {
                    if (
                        currentActiveScene &&
                        typeof currentActiveScene === "function"
                    ) {
                        currentActiveScene(scene_instance);
                    }

                    if (typeof ref === "function") {
                        ref({ game: game.current, scene: scene_instance });
                    } else if (ref) {
                        ref.current = {
                            game: game.current,
                            scene: scene_instance,
                        };
                    }

                    if (scene_instance.scene.key === "Game" && onGameReady) {
                        onGameReady();
                    }
                },
            );
            return () => {
                EventBus.removeListener("current-scene-ready");
            };
        }, [currentActiveScene, ref, onGameReady]);

        return (
            <div id="game-container" className="w-full h-full bg-black"></div>
        );
    },
);
