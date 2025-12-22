import React, { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import StartGame from "./game/main";
import { EventBus } from "./game/EventBus";
import { User } from "./common/store/_types";

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps {
    currentActiveScene?: (scene_instance: Phaser.Scene) => void;
    user: User;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(
    function PhaserGame({ currentActiveScene }, ref) {
        const game = useRef<Phaser.Game | null>(null!);
        const { data: session } = useSession();

        // Set JWT token globally BEFORE game initialization
        useLayoutEffect(() => {
            // Set window globals first
            if (session?.backendJwt) {
                console.log("PhaserGame: Setting JWT in window global");
                (window as any).__BACKEND_JWT__ = session.backendJwt;
                (window as any).__BACKEND_USER__ = session.backendUser;
                (window as any).__BACKEND_CHARACTER__ = session.backendCharacter;
            } else {
                console.warn("PhaserGame: No backendJwt in session yet");
            }

            if (game.current === null) {
                console.log("PhaserGame: Starting game...");
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
                },
            );
            return () => {
                EventBus.removeListener("current-scene-ready");
            };
        }, [currentActiveScene, ref]);

        return (
            <div id="game-container" className="w-full h-full bg-black"></div>
        );
    },
);
