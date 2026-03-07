
const URL_REGEX = /(https?:\/\/[^\s]+)/g;


const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;


const TWITTER_REGEX = /(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/;


const GITHUB_REPO_REGEX = /github\.com\/([^/]+)\/([^/\s]+)(?:\/)?$/;
const GITHUB_ISSUE_REGEX = /github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/;

const INSTAGRAM_REGEX = /(?:instagram\.com|instagr\.am)\//;
const FACEBOOK_REGEX = /(?:facebook\.com|fb\.com|fb\.watch)\//;

export interface ParsedMessage {
    type: 'text' | 'link' | 'youtube' | 'twitter' | 'github' | 'instagram' | 'facebook';
    content: string;
    url?: string;
    youtubeId?: string;
    twitterUsername?: string;
    twitterId?: string;
    githubOwner?: string;
    githubRepo?: string;
    githubIssueNumber?: string;
    githubType?: 'repo' | 'issue' | 'pull';
}

export function parseMessageContent(message: string): ParsedMessage[] {
    const parts: ParsedMessage[] = [];
    const segments = message.split(URL_REGEX);

    segments.forEach((segment) => {
        if (segment.match(/^https?:\/\//)) {
            
            const youtubeMatch = segment.match(YOUTUBE_REGEX);
            const twitterMatch = segment.match(TWITTER_REGEX);
            const githubIssueMatch = segment.match(GITHUB_ISSUE_REGEX);
            const githubRepoMatch = segment.match(GITHUB_REPO_REGEX);

            if (youtubeMatch) {
                
                parts.push({
                    type: 'youtube',
                    content: segment,
                    url: segment,
                    youtubeId: youtubeMatch[1],
                });
            } else if (twitterMatch) {
                
                parts.push({
                    type: 'twitter',
                    content: segment,
                    url: segment,
                    twitterUsername: twitterMatch[1],
                    twitterId: twitterMatch[2],
                });
            } else if (githubIssueMatch) {
                
                const type = segment.includes('/pull/') ? 'pull' : 'issue';
                parts.push({
                    type: 'github',
                    content: segment,
                    url: segment,
                    githubOwner: githubIssueMatch[1],
                    githubRepo: githubIssueMatch[2],
                    githubIssueNumber: githubIssueMatch[3],
                    githubType: type,
                });
            } else if (githubRepoMatch) {
                
                parts.push({
                    type: 'github',
                    content: segment,
                    url: segment,
                    githubOwner: githubRepoMatch[1],
                    githubRepo: githubRepoMatch[2],
                    githubType: 'repo',
                });
            } else if (segment.match(INSTAGRAM_REGEX)) {
                parts.push({
                    type: 'instagram',
                    content: segment,
                    url: segment,
                });
            } else if (segment.match(FACEBOOK_REGEX)) {
                parts.push({
                    type: 'facebook',
                    content: segment,
                    url: segment,
                });
            } else {
                parts.push({
                    type: 'link',
                    content: segment,
                    url: segment,
                });
            }
        } else if (segment.trim()) {
            
            parts.push({
                type: 'text',
                content: segment,
            });
        }
    });

    return parts;
}

export function getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return url;
    }
}
