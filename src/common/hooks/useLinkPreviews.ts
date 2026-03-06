import { useEffect, useState } from "react";
import type { ChatV2Message } from "@/communication/chatV2/_types";
import { getStandaloneGifUrl } from "@/communication/chatV2/gifUrl";
import { parseMessageContent } from "@/common/utils/linkParser";

export type LinkPreviewMetadata = {
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
};

const MAX_PREVIEW_RETRIES = 3;

const YOUTUBE_HOST_RE = /(?:youtube\.com|youtu\.be)/i;

const isWeakMetadata = (m: LinkPreviewMetadata | null) =>
    !!m && !m.title && !m.description && !m.image;

async function fetchYouTubeOembed(url: string): Promise<LinkPreviewMetadata | null> {
    try {
        const res = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        return {
            url,
            domain: "youtube.com",
            title: data.title,
            description: data.author_name,
            image: data.thumbnail_url,
            siteName: "YouTube",
        };
    } catch {
        return null;
    }
}

export function useLinkPreviews(messages: ChatV2Message[]) {
    const [linkPreviews, setLinkPreviews] = useState<
        Record<string, LinkPreviewMetadata | null>
    >({});
    const [previewRetryCounts, setPreviewRetryCounts] = useState<
        Record<string, number>
    >({});

    useEffect(() => {
        const unresolvedUrls = new Set<string>();

        for (const message of messages) {
            if (!message.content || message.deletedAt) continue;
            if (getStandaloneGifUrl(message.content)) continue;

            const parsedParts = parseMessageContent(message.content);
            const allUrls = new Set(
                parsedParts
                    .filter((part) => part.type !== "text" && !!part.url)
                    .map((part) => part.url as string),
            );
            const extractedUrls = Array.from(
                new Set(
                    (message.content.match(/https?:\/\/[^\s]+/gi) || []).map(
                        (url) => url.trim(),
                    ),
                ),
            );
            for (const url of extractedUrls) {
                allUrls.add(url);
            }

            for (const url of allUrls) {
                const existingPreview = linkPreviews[url];
                const isWeakPreview =
                    !!existingPreview &&
                    !existingPreview.title &&
                    !existingPreview.description &&
                    !existingPreview.image;
                const retryCount = previewRetryCounts[url] || 0;
                const shouldRetryWeakPreview =
                    isWeakPreview && retryCount < MAX_PREVIEW_RETRIES;
                const shouldRetryFailedPreview =
                    existingPreview === null &&
                    retryCount < MAX_PREVIEW_RETRIES;

                if (
                    existingPreview === undefined ||
                    shouldRetryWeakPreview ||
                    shouldRetryFailedPreview
                ) {
                    unresolvedUrls.add(url);
                }
            }
        }

        if (unresolvedUrls.size === 0) return;

        let cancelled = false;

        void (async () => {
            const resolvedEntries = await Promise.all(
                Array.from(unresolvedUrls).map(async (url) => {
                    try {
                        const response = await fetch(
                            `/api/link-preview?url=${encodeURIComponent(url)}`,
                        );
                        if (!response.ok) {
                            return [url, null] as const;
                        }
                        let payload =
                            (await response.json()) as LinkPreviewMetadata;

                        if (isWeakMetadata(payload) && YOUTUBE_HOST_RE.test(url)) {
                            const oembed = await fetchYouTubeOembed(url);
                            if (oembed) payload = oembed;
                        }

                        return [url, payload] as const;
                    } catch {
                        return [url, null] as const;
                    }
                }),
            );

            if (cancelled) return;

            setPreviewRetryCounts((previous) => {
                const next = { ...previous };
                for (const [url, metadata] of resolvedEntries) {
                    const isWeakPreview =
                        !!metadata &&
                        !metadata.title &&
                        !metadata.description &&
                        !metadata.image;
                    const shouldRetry = metadata === null || isWeakPreview;

                    if (shouldRetry) {
                        next[url] = (next[url] || 0) + 1;
                    } else {
                        delete next[url];
                    }
                }
                return next;
            });

            setLinkPreviews((previous) => {
                const next = { ...previous };
                for (const [url, metadata] of resolvedEntries) {
                    next[url] = metadata;
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [linkPreviews, messages, previewRetryCounts]);

    return linkPreviews;
}
