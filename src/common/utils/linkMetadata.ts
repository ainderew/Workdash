import type { LinkMetadata } from "@/communication/textChat/_types";

// YouTube URL patterns
const YOUTUBE_REGEX =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string): string | null {
    const match = url.match(YOUTUBE_REGEX);
    return match ? match[1] : null;
}

/**
 * Fetch YouTube video metadata using oEmbed API
 */
async function fetchYouTubeMetadata(url: string): Promise<LinkMetadata | null> {
    try {
        const videoId = extractYouTubeId(url);
        if (!videoId) return null;

        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(oembedUrl);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        return {
            url,
            type: "youtube",
            title: data.title,
            description: data.author_name,
            image: data.thumbnail_url,
            youtubeId: videoId,
        };
    } catch {
        return null;
    }
}

/**
 * Extract all URLs from a message
 */
function extractUrls(message: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = message.match(urlRegex);
    return matches || [];
}

/**
 * Fetch metadata for all links in a message
 */
export async function fetchLinkMetadata(
    message: string,
): Promise<LinkMetadata[]> {
    const urls = extractUrls(message);

    const metadataPromises = urls.map(async (url) => {
        // Check if it's a YouTube URL
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            const metadata = await fetchYouTubeMetadata(url);
            return metadata;
        }

        // Add more link types here (Twitter, GitHub, etc.)

        return null;
    });

    const results = await Promise.all(metadataPromises);
    const filtered = results.filter(
        (metadata): metadata is LinkMetadata => metadata !== null,
    );
    return filtered;
}
