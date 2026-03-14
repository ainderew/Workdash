import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import { EventBus } from "@/game/EventBus";
import useAchievementStore from "@/common/store/achievementStore";
import { AchievementToast } from "@/common/components/AchievementToast";
import type { AchievementUnlockPayload } from "@/communication/chatV2/_types";
import { getIsNotifLeader } from "./useDocumentFocus";

const SOUND_COOLDOWN_MS = 3000;

// Singleton audio stored on window to survive HMR reloads
function getAchievementAudio() {
    const w = window as Window & {
        __achievementAudio?: {
            audio: HTMLAudioElement | null;
            enabled: boolean;
        };
    };
    if (!w.__achievementAudio) {
        w.__achievementAudio = { audio: null, enabled: false };
    }
    return w.__achievementAudio;
}

/**
 * Listens for real-time achievement unlock events and shows a toast + plays sound.
 * Must be mounted at the App level alongside useChatNotificationSound.
 */
export function useAchievementListener() {
    const lastPlayedRef = useRef(0);

    // Prime audio element on first user interaction
    useEffect(() => {
        const singleton = getAchievementAudio();
        if (singleton.audio) return;

        singleton.audio = new Audio("/assets/sounds/achievement.mp3");
        singleton.audio.volume = 0.4;
        singleton.audio.preload = "auto";

        const enableAudio = () => {
            if (!singleton.enabled && singleton.audio) {
                singleton.audio.volume = 0;
                singleton.audio
                    .play()
                    .then(() => {
                        singleton.audio?.pause();
                        singleton.audio!.currentTime = 0;
                        singleton.audio!.volume = 0.4;
                        singleton.enabled = true;
                    })
                    .catch(() => {
                        if (singleton.audio) singleton.audio.volume = 0.4;
                    });
            }
        };

        window.addEventListener("click", enableAudio, { once: true });
        window.addEventListener("keydown", enableAudio, { once: true });

        return () => {
            window.removeEventListener("click", enableAudio);
            window.removeEventListener("keydown", enableAudio);
        };
    }, []);

    // Listen for achievement unlock events via EventBus
    useEffect(() => {
        const handler = (payload: AchievementUnlockPayload) => {
            if (!payload?.achievementKey) return;

            // Update store
            useAchievementStore.getState().handleUnlock(payload);

            // Show toast
            toast.custom(
                () =>
                    React.createElement(AchievementToast, {
                        achievementKey: payload.achievementKey,
                        icon: payload.icon,
                        name: payload.name,
                        description: payload.description,
                        rarity: payload.rarity,
                    }),
                { duration: 8000 },
            );

            // Play sound (with throttle + multi-tab guard)
            const now = Date.now();
            if (
                now - lastPlayedRef.current >= SOUND_COOLDOWN_MS &&
                getIsNotifLeader()
            ) {
                const singleton = getAchievementAudio();
                if (singleton.enabled && singleton.audio) {
                    singleton.audio.currentTime = 0;
                    singleton.audio.play().catch(() => {});
                    lastPlayedRef.current = now;
                }
            }
        };

        EventBus.on("achievement:unlocked", handler);
        return () => {
            EventBus.off("achievement:unlocked", handler);
        };
    }, []);
}
