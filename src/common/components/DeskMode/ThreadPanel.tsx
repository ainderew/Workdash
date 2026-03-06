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
import { parseMessageContent } from "@/common/utils/linkParser";
import { UnifiedLinkPreview } from "@/common/components/TextChat/UnifiedLinkPreview";
import { useLinkPreviews } from "@/common/hooks/useLinkPreviews";
import {
    buildMemberNameMap,
    extractMentionedUserIds,
    type MentionMemberNameMap,
} from "@/communication/chatV2/mentionUtils";
import { getDisplayName } from "@/common/utils/displayName";
import { formatChatMessageTimestamp } from "@/common/utils/messageTimestamp";
import {
    generateCharacterFaceDataUrl,
    toCharacterCustomization,
} from "@/common/utils/characterFaceAvatar";
import Composer from "./Composer";
import MessageHoverActions from "./MessageHoverActions";
import MentionHighlightedContent from "./MentionHighlightedContent";
import MessageReactionChips from "./MessageReactionChips";
import UserAvatar from "./UserAvatar";

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

const isPreviewableAttachment = (attachment: ChatV2Attachment) =>
    attachment.isImage || attachment.mimeType === "application/pdf";
const hasImageContent = (message: ChatV2Message) =>
    message.messageType === "IMAGE" ||
    message.attachments.some((attachment) => attachment.isImage);

type ThreadMessageRowProps = {
    message: ChatV2Message;
    isRootMessage: boolean;
    attachmentUrls: Record<string, string>;
    linkPreviews: Record<string, import("@/common/hooks/useLinkPreviews").LinkPreviewMetadata | null>;
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
                <UserAvatar
                    name={senderName}
                    spriteStyle={senderImage?.startsWith("data:") ? {
                        backgroundImage: `url('${senderImage}')`,
                        backgroundPosition: "center -20px",
                        imageRendering: "pixelated",
                    } : null}
                    image={senderImage && !senderImage.startsWith("data:") ? senderImage : null}
                    size="sm"
                />

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
                                                if (part.type !== "text" && part.url) {
                                                    return (
                                                        <a
                                                            key={`${message.id}-link-${index}`}
                                                            href={part.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="wd-text-accent hover:underline break-all"
                                                        >
                                                            {part.content}
                                                        </a>
                                                    );
                                                }
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
                                                {parsedMessageParts
                                                    .filter(
                                                        (part) =>
                                                            part.type !== "text" && !!part.url,
                                                    )
                                                    .map((part, i) => (
                                                        <UnifiedLinkPreview
                                                            key={`${message.id}-preview-${i}`}
                                                            url={part.url!}
                                                            platform={
                                                                part.type === "link"
                                                                    ? "generic"
                                                                    : part.type as "youtube" | "twitter" | "github" | "instagram" | "facebook"
                                                            }
                                                            metadata={linkPreviews[part.url!]}
                                                            platformHints={{
                                                                youtubeId: part.youtubeId,
                                                                githubType: part.githubType,
                                                            }}
                                                        />
                                                    ))}

                                                {fallbackGenericUrls.map((url, index) => (
                                                    <UnifiedLinkPreview
                                                        key={`${message.id}-fallback-preview-${index}`}
                                                        url={url}
                                                        platform="generic"
                                                        metadata={linkPreviews[url]}
                                                    />
                                                ))}
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
    const linkPreviews = useLinkPreviews(allMessages);
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

    const processedCharacterUserIds = useRef(new Set<number>());

    useEffect(() => {
        const inlineCharacterSenders = allMessages.filter((message) => {
            if (!Number.isInteger(message.senderUserId)) return false;
            if (
                typeof localBackendUserId === "number"
                && message.senderUserId === localBackendUserId
            ) {
                return false;
            }
            if (message.sender?.image?.trim()) return false;
            if (processedCharacterUserIds.current.has(message.senderUserId))
                return false;
            return !!message.sender?.characterCustomization;
        });

        if (inlineCharacterSenders.length === 0) return;

        const seen = new Set<number>();
        for (const message of inlineCharacterSenders) {
            if (seen.has(message.senderUserId)) continue;
            seen.add(message.senderUserId);
            processedCharacterUserIds.current.add(message.senderUserId);
            const cc = message.sender!.characterCustomization!;

            void generateCharacterFaceDataUrl(toCharacterCustomization(cc)).then(
                (url) => {
                    if (url) {
                        setResolvedSenderImagesByUserId((prev) => ({
                            ...prev,
                            [message.senderUserId]: url,
                        }));
                    }
                },
            );
        }
    }, [allMessages, localBackendUserId]);

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
                    } else if (profile.user.characterCustomization) {
                        const faceUrl = await generateCharacterFaceDataUrl(
                            toCharacterCustomization(profile.user.characterCustomization),
                        );
                        if (cancelled) return;
                        if (faceUrl) {
                            setResolvedSenderImagesByUserId((previous) => ({
                                ...previous,
                                [userId]: faceUrl,
                            }));
                        }
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
