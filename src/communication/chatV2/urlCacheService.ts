export type UrlVariant = "view" | "thumbnail" | "download" | "poster";

type CachedEntry = {
    url: string;
    expiresAt: number;
};

const URL_CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes

const cache = new Map<string, CachedEntry>();

const toKey = (fileId: string, variant: UrlVariant): string =>
    `${fileId}:${variant}`;

export const getCachedUrl = (
    fileId: string,
    variant: UrlVariant,
): string | null => {
    const entry = cache.get(toKey(fileId, variant));
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
        cache.delete(toKey(fileId, variant));
        return null;
    }
    return entry.url;
};

export const setCachedUrl = (
    fileId: string,
    variant: UrlVariant,
    url: string,
): void => {
    cache.set(toKey(fileId, variant), {
        url,
        expiresAt: Date.now() + URL_CACHE_TTL_MS,
    });
};

export const invalidateCachedUrl = (fileId: string): void => {
    cache.delete(toKey(fileId, "view"));
    cache.delete(toKey(fileId, "thumbnail"));
    cache.delete(toKey(fileId, "download"));
    cache.delete(toKey(fileId, "poster"));
};
