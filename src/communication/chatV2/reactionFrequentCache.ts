import type { ChatV2FrequentEmoji } from "./_types";
import { isSupportedReactionEmoji } from "./reactionCatalog";

const FREQUENT_KEY_PREFIX = "wd:chat:v2:frequent-emojis";
const MAX_PERSISTED = 32;

type FrequentEmojiLocalEntry = {
    emoji: string;
    usageCount: number;
    lastUsedAt: string;
};

const byFrequentRank = (
    a: FrequentEmojiLocalEntry,
    b: FrequentEmojiLocalEntry,
) => {
    if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount;
    }
    const aTime = new Date(a.lastUsedAt).getTime();
    const bTime = new Date(b.lastUsedAt).getTime();
    if (aTime !== bTime) {
        return bTime - aTime;
    }
    return a.emoji.localeCompare(b.emoji);
};

export const getFrequentEmojiCacheKey = (userId: number) =>
    `${FREQUENT_KEY_PREFIX}:${userId}:v1`;

export const readFrequentEmojiLocal = (userId: number): FrequentEmojiLocalEntry[] => {
    if (typeof window === "undefined") return [];

    try {
        const raw = window.localStorage.getItem(getFrequentEmojiCacheKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter(
                (entry) =>
                    !!entry &&
                    typeof entry.emoji === "string" &&
                    typeof entry.usageCount === "number" &&
                    typeof entry.lastUsedAt === "string" &&
                    isSupportedReactionEmoji(entry.emoji),
            )
            .map((entry) => ({
                emoji: entry.emoji,
                usageCount: Math.max(0, Math.floor(entry.usageCount)),
                lastUsedAt: entry.lastUsedAt,
            }))
            .sort(byFrequentRank)
            .slice(0, MAX_PERSISTED);
    } catch {
        return [];
    }
};

export const writeFrequentEmojiLocal = (
    userId: number,
    entries: FrequentEmojiLocalEntry[],
) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            getFrequentEmojiCacheKey(userId),
            JSON.stringify(entries.sort(byFrequentRank).slice(0, MAX_PERSISTED)),
        );
    } catch {
        // localStorage best-effort only
    }
};

export const mergeFrequentEmojiSources = (
    localEntries: FrequentEmojiLocalEntry[],
    serverEntries: ChatV2FrequentEmoji[],
    limit: number,
) => {
    const merged = new Map<string, FrequentEmojiLocalEntry>();

    for (const localEntry of localEntries) {
        if (!isSupportedReactionEmoji(localEntry.emoji)) continue;
        merged.set(localEntry.emoji, localEntry);
    }

    for (const serverEntry of serverEntries) {
        if (!isSupportedReactionEmoji(serverEntry.emoji)) continue;
        const existing = merged.get(serverEntry.emoji);
        const serverLastUsedAt =
            serverEntry.lastUsedAt instanceof Date
                ? serverEntry.lastUsedAt.toISOString()
                : serverEntry.lastUsedAt;
        if (!existing) {
            merged.set(serverEntry.emoji, {
                emoji: serverEntry.emoji,
                usageCount: Math.max(0, Math.floor(serverEntry.usageCount)),
                lastUsedAt: serverLastUsedAt,
            });
            continue;
        }

        merged.set(serverEntry.emoji, {
            emoji: serverEntry.emoji,
            usageCount: Math.max(existing.usageCount, serverEntry.usageCount),
            lastUsedAt:
                new Date(serverLastUsedAt).getTime()
                > new Date(existing.lastUsedAt).getTime()
                    ? serverLastUsedAt
                    : existing.lastUsedAt,
        });
    }

    return Array.from(merged.values()).sort(byFrequentRank).slice(0, limit);
};

export const bumpFrequentEmojiLocal = (
    userId: number,
    emoji: string,
    at: Date = new Date(),
) => {
    if (!isSupportedReactionEmoji(emoji)) return [];

    const current = readFrequentEmojiLocal(userId);
    const byEmoji = new Map(current.map((entry) => [entry.emoji, entry]));
    const existing = byEmoji.get(emoji);

    byEmoji.set(emoji, {
        emoji,
        usageCount: (existing?.usageCount || 0) + 1,
        lastUsedAt: at.toISOString(),
    });

    const next = Array.from(byEmoji.values()).sort(byFrequentRank).slice(0, MAX_PERSISTED);
    writeFrequentEmojiLocal(userId, next);
    return next;
};
