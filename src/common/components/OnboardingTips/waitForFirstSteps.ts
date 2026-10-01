import usePlayersStore from "@/common/store/playerStore";
import {
    IDLE_FALLBACK_MS,
    MIN_WORLD_MS,
    POSITION_POLL_MS,
    SETTLE_MS,
    WALK_THRESHOLD_PX,
} from "./constants";

function localPlayerPosition(): { x: number; y: number } | null {
    const { playerMap, localPlayerId } = usePlayersStore.getState();
    const player = localPlayerId ? playerMap[localPlayerId] : undefined;
    return player ? { x: player.physicsState.x, y: player.physicsState.y } : null;
}

/**
 * Calls `onReady` once the local avatar has taken a few steps and settled, or
 * has stood still for a while. Nothing counts until the avatar exists, so a
 * world that is still loading never triggers it. Returns a cancel function.
 */
export function waitForFirstSteps(onReady: () => void): () => void {
    const startedAt = Date.now();
    let origin: { x: number; y: number } | null = null;
    let idleTimer: number | undefined;
    let readyTimer: number | undefined;

    const ready = (delay: number) => {
        window.clearInterval(poll);
        window.clearTimeout(idleTimer);
        if (readyTimer !== undefined) return;
        const sinceStart = Date.now() - startedAt;
        readyTimer = window.setTimeout(
            onReady,
            Math.max(delay, MIN_WORLD_MS - sinceStart),
        );
    };

    const poll = window.setInterval(() => {
        const position = localPlayerPosition();
        if (!position) return;
        if (!origin) {
            origin = position;
            idleTimer = window.setTimeout(() => ready(0), IDLE_FALLBACK_MS);
            return;
        }
        const moved = Math.hypot(position.x - origin.x, position.y - origin.y);
        if (moved >= WALK_THRESHOLD_PX) ready(SETTLE_MS);
    }, POSITION_POLL_MS);

    return () => {
        window.clearInterval(poll);
        window.clearTimeout(idleTimer);
        window.clearTimeout(readyTimer);
    };
}
