export type AttachmentUrls = {
    thumbnailUrl: string | null;
    viewUrl: string | null;
    posterUrl: string | null;
};

export type AttachmentUrlMap = Record<string, AttachmentUrls>;
