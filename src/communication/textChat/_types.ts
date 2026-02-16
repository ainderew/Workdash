export type LinkMetadata = {
    url: string;
    type: 'youtube' | 'twitter' | 'github' | 'generic';
    title?: string;
    description?: string;
    image?: string;
    
    youtubeId?: string;
    
    twitterUsername?: string;
    twitterId?: string;
    
    githubOwner?: string;
    githubRepo?: string;
    githubType?: 'repo' | 'issue' | 'pull';
    githubIssueNumber?: string;
};

export type MessageStatus = 'pending' | 'sent' | 'failed';

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
    clientId?: string;
    status?: MessageStatus;
    isOptimistic?: boolean;
};
