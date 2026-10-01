import type { TipId } from "./_types";

export const TIPS_STORAGE_KEY = "workdash:onboardingTips";

/** The order tips are numbered in ("1 of 3"). */
export const TIP_ORDER: TipId[] = ["chat", "desk", "world"];

/** The `data-onboarding-target` each tip lights up. */
export const TIP_TARGET: Record<TipId, string> = {
    chat: "chat",
    desk: "desk-mode",
    world: "world-mode",
};

/** How far the avatar must move (px) to count as having walked. */
export const WALK_THRESHOLD_PX = 24;
export const POSITION_POLL_MS = 300;
/** After the first steps, let the player settle before a tip lights. */
export const SETTLE_MS = 1200;
/** Light anyway if the player stands still this long. */
export const IDLE_FALLBACK_MS = 20_000;
/** Never light a world tip sooner than this after entering the world, so the loader's dive is done. */
export const MIN_WORLD_MS = 2000;
/** Desk mode needs a beat to paint before its tip lights. */
export const DESK_SETTLE_MS = 600;
