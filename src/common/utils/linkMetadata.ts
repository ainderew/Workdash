export type LinkMetadata = {
    url: string;
    type: "youtube" | "twitter" | "github" | "generic";
    title?: string;
    description?: string;
    image?: string;
    youtubeId?: string;
    twitterUsername?: string;
    twitterId?: string;
    githubOwner?: string;
    githubRepo?: string;
    githubType?: "repo" | "issue" | "pull";
    githubIssueNumber?: string;
};


const YOUTUBE_REGEX =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;


function extractYouTubeId(url: string): string | null {
    const match = url.match(YOUTUBE_REGEX);
    return match ? match[1] : null;
}


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
