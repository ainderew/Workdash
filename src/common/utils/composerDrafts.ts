/**
 * Per-composer message drafts, persisted to localStorage so unsent text
 * survives room switches and page refreshes.
 *
 * All drafts live under one namespaced key as a `{ [draftId]: markdown }` map.
 * A single key keeps sign-out cleanup trivial and lets empty drafts self-prune.
 * Draft ids are caller-defined (e.g. `room:<roomId>`).
 */

export const COMPOSER_DRAFTS_STORAGE_KEY = "workdash:composerDrafts";

type DraftMap = Record<string, string>;

const readMap = (): DraftMap => {
    try {
        const raw = localStorage.getItem(COMPOSER_DRAFTS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as DraftMap;
        }
    } catch {
        // missing or corrupted — treat as no drafts
    }
    return {};
};

const writeMap = (map: DraftMap): void => {
    try {
        if (Object.keys(map).length === 0) {
            localStorage.removeItem(COMPOSER_DRAFTS_STORAGE_KEY);
            return;
        }
        localStorage.setItem(COMPOSER_DRAFTS_STORAGE_KEY, JSON.stringify(map));
    } catch {
        // storage unavailable — drafts silently don't persist
    }
};

/** Returns the stored draft for `id`, or `''` when there is none. */
export function getDraft(id: string): string {
    return readMap()[id] ?? "";
}

/**
 * Persists `markdown` for `id`. Empty/whitespace-only content removes the
 * entry so the store never accumulates blank drafts.
 */
export function setDraft(id: string, markdown: string): void {
    const map = readMap();
    if (markdown.trim() === "") {
        if (id in map) {
            delete map[id];
            writeMap(map);
        }
        return;
    }
    map[id] = markdown;
    writeMap(map);
}

/** Removes the draft for `id` (e.g. after a successful send). */
export function clearDraft(id: string): void {
    const map = readMap();
    if (id in map) {
        delete map[id];
        writeMap(map);
    }
}
