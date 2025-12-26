export type LinkMetadata = {
    url: string;
    type: 'youtube' | 'twitter' | 'github' | 'generic';
    title?: string;
    description?: string;
    image?: string;
    // YouTube specific
    youtubeId?: string;
    // Twitter specific
    twitterUsername?: string;
    twitterId?: string;
    // GitHub specific
    githubOwner?: string;
    githubRepo?: string;
    githubType?: 'repo' | 'issue' | 'pull';
    githubIssueNumber?: string;
};

export type Message = {
    content: string;
    senderSocketId: string;
    senderSpriteSheet: string | undefined;
    name: string;
    createdAt: Date;
    type?: "text" | "gif" | "image";
    gifUrl?: string;
    imageUrl?: string;
    linkMetadata?: LinkMetadata[];
};
