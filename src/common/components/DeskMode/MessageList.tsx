import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatV2Message } from "@/communication/chatV2/_types";
import { getStandaloneGifUrl } from "@/communication/chatV2/gifUrl";
import { getSignedAttachmentUrl } from "@/communication/chatV2/uploadService";
import { extractDomain, parseMessageContent } from "@/common/utils/linkParser";
import useUserStore from "@/common/store/useStore";
import { GitHubPreview } from "@/common/components/TextChat/GitHubPreview";
import { TwitterPreview } from "@/common/components/TextChat/TwitterPreview";
import { YouTubePreview } from "@/common/components/TextChat/YouTubePreview";
import { ExternalLink } from "lucide-react";

interface MessageListProps {
    messages: ChatV2Message[];
    isLoading: boolean;
    focusedMessageId?: string | null;
}

type LinkPreviewMetadata = {
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
};
const MAX_PREVIEW_RETRIES = 3;

const formatTime = (value: string | Date) =>
    new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

const isFacebookVideoUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        const normalizedHost = parsed.hostname.toLowerCase().replace(/^www\./, "");
        const normalizedPath = parsed.pathname.toLowerCase();

        if (normalizedHost === "fb.watch") return true;
        if (!normalizedHost.endsWith("facebook.com")) return false;
        if (normalizedPath.includes("/reel/")) return true;
        if (normalizedPath.includes("/videos/")) return true;
        if (normalizedPath === "/watch/") return true;
        if (normalizedPath === "/watch") return true;

        return false;
    } catch {
        return false;
    }
};

const getFacebookEmbedUrl = (value: string) =>
    `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        value,
    )}&show_text=false&width=560`;

function MessageList({
    messages,
    isLoading,
    focusedMessageId = null,
}: MessageListProps) {
    const endRef = useRef<HTMLDivElement>(null);
    const user = useUserStore((state) => state.user);
    const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
        {},
    );
    const [linkPreviews, setLinkPreviews] = useState<
        Record<string, LinkPreviewMetadata | null>
    >({});
    const [previewRetryCounts, setPreviewRetryCounts] = useState<
        Record<string, number>
    >({});
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
        null,
    );
    const localBackendUserId =
        typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;
    const localDisplayName = user.name?.trim() || window.__BACKEND_USER__?.name || "";
    const localSpriteSheet = user.spriteSheetDataUrl?.trim() || "";
    const localProfileImage = user.image?.trim() || window.__BACKEND_USER__?.image || "";

    useEffect(() => {
        if (focusedMessageId) {
            return;
        }
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [focusedMessageId, messages.length]);

    useEffect(() => {
        if (!focusedMessageId) {
            return;
        }

        const targetNode = document.querySelector(
            `[data-chat-message-id="${focusedMessageId}"]`,
        );
        if (!(targetNode instanceof HTMLElement)) {
            return;
        }

        targetNode.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
        setHighlightedMessageId(focusedMessageId);

        const timeout = window.setTimeout(() => {
            setHighlightedMessageId((current) =>
                current === focusedMessageId ? null : current,
            );
        }, 1800);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [focusedMessageId, messages]);

    useEffect(() => {
        const unresolvedAttachments: Array<{ roomId: string; objectKey: string }> = [];

        for (const message of messages) {
            for (const attachment of message.attachments) {
                if (!attachmentUrls[attachment.objectKey]) {
                    unresolvedAttachments.push({
                        roomId: message.roomId,
                        objectKey: attachment.objectKey,
                    });
                }
            }
        }

        if (unresolvedAttachments.length === 0) {
            return;
        }

        let cancelled = false;

        void (async () => {
            const resolvedEntries = await Promise.all(
                unresolvedAttachments.map(async (attachment) => {
                    try {
                        const downloadUrl = await getSignedAttachmentUrl({
                            roomId: attachment.roomId,
                            objectKey: attachment.objectKey,
                        });
                        return [attachment.objectKey, downloadUrl] as const;
                    } catch {
                        return null;
                    }
                }),
            );

            if (cancelled) return;

            setAttachmentUrls((previous) => {
                const next = { ...previous };
                for (const entry of resolvedEntries) {
                    if (!entry) continue;
                    next[entry[0]] = entry[1];
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [attachmentUrls, messages]);

    useEffect(() => {
        const unresolvedUrls = new Set<string>();

        for (const message of messages) {
            if (!message.content || message.deletedAt) continue;
            if (getStandaloneGifUrl(message.content)) continue;

            const parsedParts = parseMessageContent(message.content);
            const parsedUrls = new Set(
                parsedParts
                    .filter((part) => part.type !== "text" && !!part.url)
                    .map((part) => part.url as string),
            );
            const genericUrlsFromParser = parsedParts
                .filter((part) => part.type === "link" && !!part.url)
                .map((part) => part.url as string);
            const extractedUrls = Array.from(
                new Set(
                    (message.content.match(/https?:\/\/[^\s]+/gi) || []).map((url) =>
                        url.trim(),
                    ),
                ),
            );
            const genericUrls = new Set<string>([
                ...genericUrlsFromParser,
                ...extractedUrls.filter((url) => !parsedUrls.has(url)),
            ]);

            for (const url of genericUrls) {
                const existingPreview = linkPreviews[url];
                const isWeakPreview =
                    !!existingPreview
                    && !existingPreview.title
                    && !existingPreview.description
                    && !existingPreview.image;
                const retryCount = previewRetryCounts[url] || 0;
                const shouldRetryWeakPreview =
                    isWeakPreview
                    && retryCount < MAX_PREVIEW_RETRIES;
                const shouldRetryFailedPreview =
                    existingPreview === null
                    && retryCount < MAX_PREVIEW_RETRIES;

                if (
                    existingPreview === undefined
                    || shouldRetryWeakPreview
                    || shouldRetryFailedPreview
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
                        const payload = (await response.json()) as LinkPreviewMetadata;
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
                        !!metadata
                        && !metadata.title
                        && !metadata.description
                        && !metadata.image;
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

    const orderedMessages = useMemo(
        () =>
            [...messages].sort((a, b) => {
                const timeDiff =
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime();
                if (timeDiff !== 0) return timeDiff;
                return a.id.localeCompare(b.id);
            }),
        [messages],
    );

    const getSenderName = (message: ChatV2Message) => {
        const isLocalSender =
            localBackendUserId !== undefined
            && message.senderUserId === localBackendUserId;
        if (isLocalSender && localDisplayName) {
            return localDisplayName;
        }
        return message.sender?.name?.trim() || `User ${message.senderUserId}`;
    };

    const getSenderAvatar = (message: ChatV2Message) => {
        const isLocalSender =
            localBackendUserId !== undefined
            && message.senderUserId === localBackendUserId;

        if (isLocalSender && localSpriteSheet) {
            return {
                mode: "sprite" as const,
                style: {
                    backgroundImage: `url('${localSpriteSheet}')`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "-94px -20px",
                    imageRendering: "pixelated" as const,
                },
            };
        }

        const senderImage = message.sender?.image?.trim();
        if (senderImage) {
            return { mode: "image" as const, src: senderImage };
        }

        if (isLocalSender && localProfileImage) {
            return { mode: "image" as const, src: localProfileImage };
        }

        return { mode: "fallback" as const };
    };

    const renderGenericLinkPreview = (
        url: string,
        key: string,
        metadata?: LinkPreviewMetadata | null,
    ) => {
        const isFacebookVideo = isFacebookVideoUrl(url);
        const hasRichMetadata = !!(metadata?.title || metadata?.description || metadata?.image);

        if (hasRichMetadata && !isFacebookVideo) {
            const displayDomain = metadata?.domain || extractDomain(metadata?.url || url);
            const displayTitle = metadata?.title || metadata?.siteName || displayDomain;
            const displayDescription =
                metadata?.description || metadata?.siteName || metadata?.url || url;
            const displayUrl = metadata?.url || url;
            const previewImageSrc = metadata?.image;

            return (
                <a
                    key={key}
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block max-w-md overflow-hidden rounded-md border wd-border-subtle wd-bg-elevated transition-colors hover:bg-[var(--wd-surface-base)]"
                >
                    {previewImageSrc && (
                        <img
                            src={previewImageSrc}
                            alt={displayTitle}
                            className="h-36 w-full object-cover border-b wd-border-subtle"
                        />
                    )}
                    <div className="px-3 py-2">
                        <p className="text-xs wd-text-muted truncate">{displayDomain}</p>
                        <p className="mt-1 text-sm wd-text-primary font-medium line-clamp-2">
                            {displayTitle}
                        </p>
                        <p className="mt-1 text-xs wd-text-secondary line-clamp-3">
                            {displayDescription}
                        </p>
                    </div>
                </a>
            );
        }

        if (isFacebookVideo) {
            const displayUrl = metadata?.url || url;
            const displayDomain = metadata?.domain || extractDomain(displayUrl);
            const displayTitle = metadata?.title || "Facebook video";
            const displayDescription = metadata?.description || "Open on Facebook";

            return (
                <div
                    key={key}
                    className="mt-2 block max-w-md overflow-hidden rounded-md border wd-border-subtle wd-bg-elevated"
                >
                    <div className="aspect-video w-full bg-black">
                        <iframe
                            src={getFacebookEmbedUrl(displayUrl)}
                            title={displayTitle}
                            className="h-full w-full border-0"
                            loading="lazy"
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                    <a
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2 transition-colors hover:bg-[var(--wd-surface-base)]"
                    >
                        <p className="text-xs wd-text-muted truncate">{displayDomain}</p>
                        <p className="mt-1 text-sm wd-text-primary font-medium line-clamp-2">
                            {displayTitle}
                        </p>
                        <p className="mt-1 text-xs wd-text-secondary line-clamp-2">
                            {displayDescription}
                        </p>
                    </a>
                </div>
            );
        }

        return (
        <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block max-w-md rounded-md border wd-border-subtle wd-bg-elevated px-3 py-2 transition-colors hover:bg-[var(--wd-surface-base)]"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs wd-text-muted truncate">
                        {extractDomain(url)}
                    </p>
                    <p className="text-sm wd-text-accent truncate">{url}</p>
                </div>
                <ExternalLink size={14} className="shrink-0 wd-text-secondary" />
            </div>
        </a>
        );
    };

    return (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 wd-bg-panel-2">
            {isLoading ? (
                <div className="text-xs wd-text-muted">Loading messages...</div>
            ) : orderedMessages.length === 0 ? (
                <div className="text-xs wd-text-muted">
                    No messages yet. Start the room conversation.
                </div>
            ) : (
                orderedMessages.map((message) => {
                    const senderName = getSenderName(message);
                    const senderAvatar = getSenderAvatar(message);
                    const standaloneGifUrl =
                        message.messageType === "IMAGE"
                            && message.attachments.length === 0
                            ? getStandaloneGifUrl(message.content)
                            : null;
                    const parsedMessageParts =
                        message.content && !standaloneGifUrl
                            ? parseMessageContent(message.content)
                            : [];
                    const parsedMessageLinks = parsedMessageParts.filter(
                        (part) => part.type !== "text" && !!part.url,
                    );
                    const parsedMessageLinkUrls = new Set(
                        parsedMessageLinks.map((part) => part.url as string),
                    );
                    const extractedUrls = Array.from(
                        new Set(
                            (message.content?.match(/https?:\/\/[^\s]+/gi) || []).map(
                                (url) => url.trim(),
                            ),
                        ),
                    );
                    const fallbackGenericUrls = extractedUrls.filter(
                        (url) => !parsedMessageLinkUrls.has(url),
                    );

                    return (
                        <div
                            key={message.id}
                            data-chat-message-id={message.id}
                            className={`flex gap-3 rounded-md px-1 py-1 transition-colors ${
                                highlightedMessageId === message.id
                                    ? "bg-[var(--wd-accent-soft)]"
                                    : ""
                            }`}
                        >
                            <div className="w-9 h-9 rounded-full wd-bg-elevated wd-text-secondary text-xs flex items-center justify-center font-semibold overflow-hidden border wd-border-subtle">
                                {senderAvatar.mode === "sprite" ? (
                                    <div
                                        className="w-full h-full bg-no-repeat"
                                        style={senderAvatar.style}
                                    />
                                ) : senderAvatar.mode === "image" ? (
                                    <img
                                        src={senderAvatar.src}
                                        alt={`${senderName} avatar`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span>{senderName.charAt(0).toUpperCase()}</span>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold wd-text-primary">
                                        {senderName}
                                    </span>
                                    <span className="text-xs wd-text-muted">
                                        {formatTime(message.createdAt)}
                                    </span>
                                    {message.editedAt && (
                                        <span className="text-[10px] uppercase tracking-wide wd-text-muted">
                                            edited
                                        </span>
                                    )}
                                </div>

                                {message.deletedAt ? (
                                    <div className="text-sm wd-text-muted italic">
                                        Message deleted
                                    </div>
                                ) : (
                                    <div>
                                        {standaloneGifUrl && (
                                            <div className="mt-1">
                                                <img
                                                    src={standaloneGifUrl}
                                                    alt="GIF"
                                                    className="rounded-md max-w-xs max-h-56 object-contain border wd-border-subtle"
                                                />
                                            </div>
                                        )}

                                        {message.content && !standaloneGifUrl && (
                                            <div>
                                                <div className="text-sm wd-text-secondary whitespace-pre-wrap break-words">
                                                    {parsedMessageLinks.length > 0
                                                        ? parsedMessageParts.map((part, index) => {
                                                            if (part.type !== "text") return null;
                                                            return (
                                                                <span
                                                                    key={`${message.id}-text-${index}`}
                                                                >
                                                                    {part.content}
                                                                </span>
                                                            );
                                                        })
                                                        : message.content}
                                                </div>

                                                {(parsedMessageLinks.length > 0
                                                    || fallbackGenericUrls.length > 0) && (
                                                        <div className="mt-2">
                                                            {parsedMessageParts.map((part, index) => {
                                                                const key =
                                                                    `${message.id}-preview-${index}`;

                                                                if (
                                                                    part.type === "youtube"
                                                                    && part.youtubeId
                                                                    && part.url
                                                                ) {
                                                                    return (
                                                                        <YouTubePreview
                                                                            key={key}
                                                                            videoId={part.youtubeId}
                                                                            url={part.url}
                                                                        />
                                                                    );
                                                                }

                                                                if (
                                                                    part.type === "twitter"
                                                                    && part.twitterUsername
                                                                    && part.twitterId
                                                                    && part.url
                                                                ) {
                                                                    return (
                                                                        <TwitterPreview
                                                                            key={key}
                                                                            username={
                                                                                part.twitterUsername
                                                                            }
                                                                            twitterId={part.twitterId}
                                                                            url={part.url}
                                                                        />
                                                                    );
                                                                }

                                                                if (
                                                                    part.type === "github"
                                                                    && part.githubOwner
                                                                    && part.githubRepo
                                                                    && part.githubType
                                                                    && part.url
                                                                ) {
                                                                    return (
                                                                        <GitHubPreview
                                                                            key={key}
                                                                            owner={part.githubOwner}
                                                                            repo={part.githubRepo}
                                                                            type={part.githubType}
                                                                            issueNumber={
                                                                                part.githubIssueNumber
                                                                            }
                                                                            url={part.url}
                                                                        />
                                                                    );
                                                                }

                                                                            if (part.type === "link" && part.url) {
                                                                                return renderGenericLinkPreview(
                                                                                    part.url,
                                                                                    key,
                                                                                    linkPreviews[part.url],
                                                                                );
                                                                            }

                                                                return null;
                                                            })}

                                                            {fallbackGenericUrls.map((url, index) =>
                                                                renderGenericLinkPreview(
                                                                    url,
                                                                    `${message.id}-fallback-preview-${index}`,
                                                                    linkPreviews[url],
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                        {message.attachments.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {message.attachments.map((attachment) => (
                                                    <div key={attachment.id}>
                                                        {attachment.isImage
                                                        && attachmentUrls[attachment.objectKey] ? (
                                                            <img
                                                                src={
                                                                    attachmentUrls[
                                                                        attachment.objectKey
                                                                    ]
                                                                }
                                                                alt={attachment.originalFileName}
                                                                className="rounded-md max-w-xs max-h-56 object-cover border wd-border-subtle"
                                                            />
                                                        ) : attachmentUrls[attachment.objectKey] ? (
                                                            <a
                                                                href={
                                                                    attachmentUrls[
                                                                        attachment.objectKey
                                                                    ]
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs px-2 py-1 rounded wd-bg-elevated wd-text-accent truncate inline-block border wd-border-subtle"
                                                            >
                                                                {attachment.originalFileName}
                                                            </a>
                                                        ) : (
                                                            <div className="text-xs px-2 py-1 rounded wd-bg-elevated wd-text-secondary truncate border wd-border-subtle">
                                                                Resolving {attachment.originalFileName}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
            <div ref={endRef} />
        </div>
    );
}

export default MessageList;
