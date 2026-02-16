const SINGLE_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

const GIF_HOSTNAME_SEGMENTS = [
    "giphy.com",
    "media.giphy.com",
    "tenor.com",
    "media.tenor.com",
];

export function extractSingleUrl(content: string): string | null {
    const trimmed = content.trim();
    if (!trimmed) return null;
    if (!SINGLE_URL_PATTERN.test(trimmed)) return null;
    return trimmed;
}

export function isGifUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();

        const isKnownGifHost = GIF_HOSTNAME_SEGMENTS.some(
            (segment) => host === segment || host.endsWith(`.${segment}`),
        );
        if (isKnownGifHost) {
            return true;
        }

        return path.endsWith(".gif");
    } catch {
        return false;
    }
}

export function getStandaloneGifUrl(content: string): string | null {
    const url = extractSingleUrl(content);
    if (!url) return null;
    return isGifUrl(url) ? url : null;
}
