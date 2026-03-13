import React, { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import StartGame from "./game/main";
import { EventBus } from "./game/EventBus";
import { User } from "./common/store/_types";
import useUserStore from "./common/store/useStore";
import { CONFIG } from "./common/utils/config";
import { Multiplayer } from "./game/multiplayer/multiplayer";
import { tokenStore } from "./common/utils/tokenStore";

declare global {
    interface Window {
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
                tokenStore.setJwt(session.backendJwt);
                if (session.backendUser) tokenStore.setUser(session.backendUser);
                if (session.backendCharacter) tokenStore.setCharacter(session.backendCharacter);

                // Hydrate Zustand with the backend user from session
                if (session.backendUser) {
                    useUserStore.getState().setBackendUser(session.backendUser);
                }
                if (session.backendUser?.image) {
                    useUserStore.getState().updateUser({ image: session.backendUser.image });
                }
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
            if (!session?.backendJwt) return;
            let cancelled = false;

            void (async () => {
                try {
                    const res = await fetch(`${CONFIG.SFU_SERVER_URL}/api/user/me`, {
                        headers: { Authorization: `Bearer ${session.backendJwt}` },
                    });
                    if (!res.ok || cancelled) return;
                    const data = await res.json();
                    const freshImage = data.user?.avatarUrl?.trim() || "";

                    if (cancelled) return;

                    // Update all sources with fresh DB value
                    tokenStore.updateUser({ image: freshImage || undefined });
                    useUserStore.getState().updateBackendUser({
                        image: freshImage || undefined,
                    });
                    useUserStore.getState().updateUser({
                        image: freshImage || undefined,
                    });
                } catch {
                    // Best-effort — session data is the fallback
                }
            })();

            return () => { cancelled = true; };
        }, [session?.backendJwt]);

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
