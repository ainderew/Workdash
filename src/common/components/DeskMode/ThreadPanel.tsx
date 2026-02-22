import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ExternalLink,
    RefreshCw,
    X,
} from "lucide-react";
import { toast } from "sonner";
import type {
    ChatV2CreateAttachment,
    ChatV2Attachment,
    ChatV2Message,
    ChatV2RoomMember,
} from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { getStandaloneGifUrl } from "@/communication/chatV2/gifUrl";
import {
    downloadChatFile,
    getChatFilePreviewUrl,
} from "@/communication/chatV2/uploadService";
import { extractDomain, parseMessageContent } from "@/common/utils/linkParser";
import { GitHubPreview } from "@/common/components/TextChat/GitHubPreview";
import { TwitterPreview } from "@/common/components/TextChat/TwitterPreview";
import { YouTubePreview } from "@/common/components/TextChat/YouTubePreview";
import {
    buildMemberNameMap,
    extractMentionedUserIds,
    type MentionMemberNameMap,
} from "@/communication/chatV2/mentionUtils";
import { getDisplayName } from "@/common/utils/displayName";
import { formatChatMessageTimestamp } from "@/common/utils/messageTimestamp";
import Composer from "./Composer";
import MessageHoverActions from "./MessageHoverActions";
import MentionHighlightedContent from "./MentionHighlightedContent";
import MessageReactionChips from "./MessageReactionChips";

interface ThreadPanelProps {
    roomId: string | null;
    rootMessage: ChatV2Message | null;
    replies: ChatV2Message[];
    isLoading: boolean;
    isSending: boolean;
    error: string | null;
    className?: string;
    members?: ChatV2RoomMember[];
    onClose: () => void;
    onRetry?: () => void;
    frequentEmojis: string[];
    onSendReply: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
        options?: { mentionedUserIds?: number[] },
    ) => Promise<void>;
    onToggleReaction: (messageId: string, emoji: string) => Promise<void> | void;
}

const byCreatedAtAsc = (a: ChatV2Message, b: ChatV2Message) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
};

const MAX_PREVIEW_RETRIES = 3;
const isPreviewableAttachment = (attachment: ChatV2Attachment) =>
    attachment.isImage || attachment.mimeType === "application/pdf";
const hasImageContent = (message: ChatV2Message) =>
    message.messageType === "IMAGE" ||
    message.attachments.some((attachment) => attachment.isImage);

type LinkPreviewMetadata = {
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
};

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

type ThreadMessageRowProps = {
    message: ChatV2Message;
    isRootMessage: boolean;
    attachmentUrls: Record<string, string>;
    linkPreviews: Record<string, LinkPreviewMetadata | null>;
    frequentEmojis: string[];
    onToggleReaction: (messageId: string, emoji: string) => Promise<void> | void;
    canUnsendImage: boolean;
    onUnsendImage: (message: ChatV2Message) => void;
    onDownloadAttachment: (fileId: string, filename: string) => void;
    resolvedSenderImage?: string;
    memberNameMap: MentionMemberNameMap;
};

function ThreadMessageRow({
    message,
    isRootMessage,
    attachmentUrls,
    linkPreviews,
    frequentEmojis,
    onToggleReaction,
    canUnsendImage,
    onUnsendImage,
    onDownloadAttachment,
    resolvedSenderImage,
    memberNameMap,
}: ThreadMessageRowProps) {
    const senderName = getDisplayName(
        message.sender,
        `User ${message.senderUserId}`,
    );
    const senderImage = message.sender?.image?.trim() || resolvedSenderImage || "";
    const standaloneGifUrl =
        message.messageType === "IMAGE" && message.attachments.length === 0
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
            (message.content?.match(/https?:\/\/[^\s]+/gi) || []).map((url) =>
                url.trim(),
            ),
        ),
    );
    const fallbackGenericUrls = extractedUrls.filter(
        (url) => !parsedMessageLinkUrls.has(url),
    );
    const effectiveMentionedUserIds =
        Array.isArray(message.mentionedUserIds) && message.mentionedUserIds.length > 0
            ? message.mentionedUserIds
            : extractMentionedUserIds(message.content || "", memberNameMap);
    const hasMentions = effectiveMentionedUserIds.length > 0;

    const handleFutureMessageAction = (label: string) => {
        toast(`${label} is coming soon`, {
            description: "This action is a placeholder for now.",
        });
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
                        <p className="text-xs wd-text-muted truncate">{extractDomain(url)}</p>
                        <p className="text-sm wd-text-accent truncate">{url}</p>
                    </div>
                    <ExternalLink size={14} className="shrink-0 wd-text-secondary" />
                </div>
            </a>
        );
    };

    const localBackendUserId =
        typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;
    const isCurrentUserMentioned =
        typeof localBackendUserId === "number"
        && hasMentions
        && effectiveMentionedUserIds.includes(localBackendUserId);

    return (
        <article
            className={`group relative px-0 py-1 ${
                isCurrentUserMentioned ? "border-l-2 border-l-[rgb(240,185,11)] bg-[rgba(240,185,11,0.06)]" : ""
            }`}
            data-chat-thread-message-id={message.id}
        >
            <MessageHoverActions
                className="right-3"
                canReply={isRootMessage}
                frequentEmojis={frequentEmojis}
                onReply={
                    isRootMessage
                        ? () =>
                            toast("Use the reply composer below", {
                                description:
                                    "Replies append to this thread from the composer.",
                            })
                        : undefined
                }
                onReact={(emoji) => {
                    void onToggleReaction(message.id, emoji);
                }}
                onUnsend={
                    canUnsendImage ? () => onUnsendImage(message) : undefined
                }
                onFutureAction={handleFutureMessageAction}
            />

            <div className="flex items-start gap-3 pr-24">
                <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden border wd-border-subtle wd-bg-panel inline-flex items-center justify-center text-xs font-semibold wd-text-primary">
                    {senderImage ? (
                        <img
                            src={senderImage}
                            alt={`${senderName} avatar`}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        senderName.charAt(0).toUpperCase()
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold wd-text-primary">
                            {senderName}
                        </span>
                        <span className="text-xs wd-text-muted">
                            {formatChatMessageTimestamp(message.createdAt)}
                        </span>
                        {message.editedAt && (
                            <span className="text-[10px] uppercase tracking-wide wd-text-muted">
                                edited
                            </span>
                        )}
                    </div>

                    {message.deletedAt ? (
                        <p className="text-sm italic wd-text-muted">Message deleted</p>
                    ) : (
                        <div className="space-y-2">
                            {standaloneGifUrl ? (
                                <img
                                    src={standaloneGifUrl}
                                    alt="GIF"
                                    className="rounded-md max-w-xs max-h-56 object-contain border wd-border-subtle"
                                />
                            ) : message.content ? (
                                <div>
                                    <div className="text-sm wd-text-secondary whitespace-pre-wrap break-words">
                                        {parsedMessageLinks.length > 0
                                            ? parsedMessageParts.map((part, index) => {
                                                if (part.type !== "text") return null;
                                                if (hasMentions && part.content) {
                                                    return (
                                                        <MentionHighlightedContent
                                                            key={`${message.id}-text-${index}`}
                                                            content={part.content}
                                                            mentionedUserIds={effectiveMentionedUserIds}
                                                            memberNameMap={memberNameMap}
                                                        />
                                                    );
                                                }
                                                return (
                                                    <span
                                                        key={`${message.id}-text-${index}`}
                                                    >
                                                        {part.content}
                                                    </span>
                                                );
                                            })
                                            : hasMentions
                                                ? (
                                                    <MentionHighlightedContent
                                                        content={message.content}
                                                        mentionedUserIds={effectiveMentionedUserIds}
                                                        memberNameMap={memberNameMap}
                                                    />
                                                )
                                                : message.content}
                                    </div>

                                    {(parsedMessageLinks.length > 0
                                        || fallbackGenericUrls.length > 0) && (
                                            <div className="mt-2">
                                                {parsedMessageParts.map((part, index) => {
                                                    const key = `${message.id}-preview-${index}`;

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
                                                                username={part.twitterUsername}
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
                                                                issueNumber={part.githubIssueNumber}
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
                            ) : null}

                            {message.attachments.length > 0 ? (
                                <div className="space-y-1">
                                    {message.attachments.map((attachment) => {
                                        const signedUrl = attachmentUrls[attachment.id];
                                        const isPdfAttachment =
                                            attachment.mimeType === "application/pdf";
                                        const isPreviewable =
                                            isPreviewableAttachment(attachment);

                                        if (isPreviewable && !signedUrl) {
                                            return (
                                                <div
                                                    key={attachment.id}
                                                    className="text-xs px-2 py-1 rounded wd-bg-panel-2 wd-text-muted border wd-border-subtle"
                                                >
                                                    Resolving {attachment.originalFileName}
                                                </div>
                                            );
                                        }

                                        if (attachment.isImage) {
                                            return (
                                                <img
                                                    key={attachment.id}
                                                    src={signedUrl}
                                                    alt={attachment.originalFileName}
                                                    className="rounded-md max-w-xs max-h-56 object-cover border wd-border-subtle"
                                                />
                                            );
                                        }

                                        if (isPdfAttachment && signedUrl) {
                                            return (
                                                <div key={attachment.id} className="space-y-1">
                                                    <iframe
                                                        src={signedUrl}
                                                        title={attachment.originalFileName}
                                                        className="h-64 w-full max-w-md rounded-md border wd-border-subtle"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onDownloadAttachment(
                                                                attachment.id,
                                                                attachment.originalFileName,
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded wd-bg-panel-2 wd-text-accent border wd-border-subtle"
                                                    >
                                                        <span className="truncate max-w-[240px]">
                                                            {attachment.originalFileName}
                                                        </span>
                                                        <ExternalLink size={11} />
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <button
                                                key={attachment.id}
                                                type="button"
                                                onClick={() =>
                                                    onDownloadAttachment(
                                                        attachment.id,
                                                        attachment.originalFileName,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded wd-bg-panel-2 wd-text-accent border wd-border-subtle"
                                            >
                                                <span className="truncate max-w-[240px]">
                                                    {attachment.originalFileName}
                                                </span>
                                                <ExternalLink size={11} />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}

                            <MessageReactionChips
                                roomId={message.roomId}
                                messageId={message.id}
                                reactions={message.reactions || []}
                                onToggleReaction={(emoji) => {
                                    void onToggleReaction(message.id, emoji);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

function ThreadPanel({
    roomId,
    rootMessage,
    replies,
    isLoading,
    isSending,
    error,
    className,
    members,
    onClose,
    onRetry,
    frequentEmojis,
    onSendReply,
    onToggleReaction,
}: ThreadPanelProps) {
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
    const [linkPreviews, setLinkPreviews] = useState<
        Record<string, LinkPreviewMetadata | null>
    >({});
    const [previewRetryCounts, setPreviewRetryCounts] = useState<
        Record<string, number>
    >({});
    const [resolvedSenderImagesByUserId, setResolvedSenderImagesByUserId] = useState<
        Record<number, string>
    >({});
    const [avatarImageLookupStatusByUserId, setAvatarImageLookupStatusByUserId] =
        useState<Record<number, "pending" | "done">>({});
    const localBackendUserId =
        typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;

    const memberNameMap = useMemo(
        () => buildMemberNameMap(members || []),
        [members],
    );
    const orderedReplies = useMemo(() => [...replies].sort(byCreatedAtAsc), [replies]);
    const allMessages = useMemo(
        () => (rootMessage ? [rootMessage, ...orderedReplies] : orderedReplies),
        [orderedReplies, rootMessage],
    );
    const threadScrollSignature = useMemo(() => {
        const rootId = rootMessage?.id || "no-root";
        const lastReplyId = orderedReplies[orderedReplies.length - 1]?.id || "no-reply";
        return `${rootId}:${orderedReplies.length}:${lastReplyId}`;
    }, [orderedReplies, rootMessage?.id]);

    useEffect(() => {
        const unresolvedAttachments: Array<{ fileId: string }> = [];

        for (const message of allMessages) {
            for (const attachment of message.attachments) {
                if (
                    isPreviewableAttachment(attachment) &&
                    !attachmentUrls[attachment.id]
                ) {
                    unresolvedAttachments.push({
                        fileId: attachment.id,
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
                        const previewUrl = await getChatFilePreviewUrl(
                            attachment.fileId,
                        );
                        return [attachment.fileId, previewUrl] as const;
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
    }, [allMessages, attachmentUrls]);

    useEffect(() => {
        if (!rootMessage || isLoading) {
            return;
        }

        const rafId = window.requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop =
                    scrollContainerRef.current.scrollHeight;
            }
            endRef.current?.scrollIntoView({ behavior: "auto" });
        });

        return () => {
            window.cancelAnimationFrame(rafId);
        };
    }, [isLoading, rootMessage, threadScrollSignature]);

    useEffect(() => {
        const unresolvedUrls = new Set<string>();

        for (const message of allMessages) {
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
    }, [allMessages, linkPreviews, previewRetryCounts]);

    useEffect(() => {
        const unresolvedSenderUserIds = Array.from(
            new Set(
                allMessages
                    .filter((message) => {
                        if (!Number.isInteger(message.senderUserId)) return false;
                        if (
                            typeof localBackendUserId === "number"
                            && message.senderUserId === localBackendUserId
                        ) {
                            return false;
                        }
                        if (message.sender?.image?.trim()) return false;
                        if (resolvedSenderImagesByUserId[message.senderUserId]) return false;
                        if (
                            avatarImageLookupStatusByUserId[message.senderUserId]
                            === "pending"
                        ) {
                            return false;
                        }
                        if (
                            avatarImageLookupStatusByUserId[message.senderUserId]
                            === "done"
                        ) {
                            return false;
                        }
                        return true;
                    })
                    .map((message) => message.senderUserId),
            ),
        );

        if (unresolvedSenderUserIds.length === 0) {
            return;
        }

        let cancelled = false;
        setAvatarImageLookupStatusByUserId((previous) => {
            const next = { ...previous };
            for (const userId of unresolvedSenderUserIds) {
                next[userId] = "pending";
            }
            return next;
        });

        void (async () => {
            for (const userId of unresolvedSenderUserIds) {
                try {
                    const profile = await chatV2Service.getUserProfile(userId);
                    if (cancelled) return;

                    const image = profile.user.image?.trim();
                    if (image) {
                        setResolvedSenderImagesByUserId((previous) => ({
                            ...previous,
                            [userId]: image,
                        }));
                    }
                } catch {
                    // Best-effort avatar resolution only.
                }

                if (cancelled) return;
                setAvatarImageLookupStatusByUserId((previous) => ({
                    ...previous,
                    [userId]: "done",
                }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        allMessages,
        avatarImageLookupStatusByUserId,
        chatV2Service,
        localBackendUserId,
        resolvedSenderImagesByUserId,
    ]);

    const handleDownloadAttachment = (fileId: string, filename: string) => {
        void (async () => {
            try {
                await downloadChatFile(fileId);
            } catch (error) {
                toast("Download failed", {
                    description:
                        error instanceof Error
                            ? error.message
                            : `Failed to download ${filename}`,
                });
            }
        })();
    };

    const handleUnsendImage = (message: ChatV2Message) => {
        if (
            typeof localBackendUserId !== "number" ||
            message.senderUserId !== localBackendUserId
        ) {
            return;
        }
        if (message.deletedAt || !hasImageContent(message)) {
            return;
        }

        const confirmed = window.confirm(
            "Unsend this image message for everyone in this chat?",
        );
        if (!confirmed) return;

        void (async () => {
            try {
                await chatV2Service.deleteMessage(message.roomId, message.id);
                toast("Image unsent", {
                    description: "The image message was removed.",
                });
            } catch (error) {
                toast("Unable to unsend image", {
                    description:
                        error instanceof Error
                            ? error.message
                            : "Please try again.",
                });
            }
        })();
    };

    return (
        <aside
            className={`flex h-full min-h-0 w-[370px] max-w-[45vw] min-w-[320px] flex-col border-l wd-border-subtle wd-bg-panel ${className ?? ""}`}
        >
            <header className="h-12 shrink-0 border-b wd-border-subtle px-3 flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold wd-text-primary">Thread</p>
                    <p className="text-[11px] wd-text-muted">Replies to main message</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="h-8 w-8 rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary inline-flex items-center justify-center transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                    aria-label="Close thread panel"
                >
                    <X size={15} />
                </button>
            </header>

            <div
                ref={scrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3"
            >
                {isLoading ? (
                    <div className="text-xs wd-text-muted">Loading thread...</div>
                ) : error ? (
                    <div className="rounded-md border wd-border-subtle wd-bg-warning-soft p-3 text-xs wd-text-warning">
                        <p>{error}</p>
                        {onRetry ? (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="mt-2 h-7 rounded-md border wd-border-subtle wd-bg-elevated px-2 inline-flex items-center gap-1 text-xs wd-text-secondary transition-colors hover:wd-text-primary"
                            >
                                <RefreshCw size={11} />
                                Retry
                            </button>
                        ) : null}
                    </div>
                ) : !rootMessage ? (
                    <div className="text-xs wd-text-muted">
                        Select a message to view its thread.
                    </div>
                ) : (
                    <>
                        <ThreadMessageRow
                            message={rootMessage}
                            isRootMessage
                            attachmentUrls={attachmentUrls}
                            linkPreviews={linkPreviews}
                            frequentEmojis={frequentEmojis}
                            onToggleReaction={onToggleReaction}
                            canUnsendImage={
                                typeof localBackendUserId === "number" &&
                                rootMessage.senderUserId === localBackendUserId &&
                                !rootMessage.deletedAt &&
                                hasImageContent(rootMessage)
                            }
                            onUnsendImage={handleUnsendImage}
                            onDownloadAttachment={handleDownloadAttachment}
                            resolvedSenderImage={
                                resolvedSenderImagesByUserId[rootMessage.senderUserId]
                            }
                            memberNameMap={memberNameMap}
                        />

                        <div className="pl-11 pr-2 pt-2">
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-[var(--wd-border-subtle)]" />
                                <span className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                                    Replies
                                </span>
                                <div className="h-px flex-1 bg-[var(--wd-border-subtle)]" />
                            </div>
                        </div>

                        {orderedReplies.length === 0 ? (
                            <div className="pl-11 text-xs wd-text-muted">
                                No replies yet. Start the thread below.
                            </div>
                        ) : (
                            orderedReplies.map((reply) => (
                                <div key={reply.id} className="pl-6">
                                    <ThreadMessageRow
                                        message={reply}
                                        isRootMessage={false}
                                        attachmentUrls={attachmentUrls}
                                        linkPreviews={linkPreviews}
                                        frequentEmojis={frequentEmojis}
                                        onToggleReaction={onToggleReaction}
                                        canUnsendImage={
                                            typeof localBackendUserId === "number" &&
                                            reply.senderUserId === localBackendUserId &&
                                            !reply.deletedAt &&
                                            hasImageContent(reply)
                                        }
                                        onUnsendImage={handleUnsendImage}
                                        onDownloadAttachment={handleDownloadAttachment}
                                        resolvedSenderImage={
                                            resolvedSenderImagesByUserId[reply.senderUserId]
                                        }
                                        memberNameMap={memberNameMap}
                                    />
                                </div>
                            ))
                        )}
                    </>
                )}
                <div ref={endRef} />
            </div>

            <Composer
                roomId={roomId}
                disabled={!roomId || !rootMessage}
                isSending={isSending}
                inputId="desk-thread-reply-input"
                placeholder={
                    rootMessage
                        ? `Reply to ${getDisplayName(rootMessage.sender, "thread")}`
                        : "Reply in thread"
                }
                members={members}
                onSend={onSendReply}
            />
        </aside>
    );
}

export default ThreadPanel;
