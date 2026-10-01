import { TIPS_STORAGE_KEY } from "./constants";
import type { TipId } from "./_types";

export type SeenTips = Partial<Record<TipId, true>>;

/** Tips this browser has already retired. Missing or corrupt storage reads as none. */
export function readSeenTips(): SeenTips {
    try {
        const raw = localStorage.getItem(TIPS_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as SeenTips;
        }
    } catch {
        // storage blocked or corrupt — treat as nothing seen
    }
    return {};
}

/** Retires `id` for good and returns the updated set. */
export function markTipSeen(id: TipId): SeenTips {
    const next: SeenTips = { ...readSeenTips(), [id]: true };
    try {
        localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(next));
    } catch {
        // storage unavailable — the tip still stays retired for this session
    }
    return next;
}
