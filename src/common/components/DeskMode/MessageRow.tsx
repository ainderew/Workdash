import React, { useMemo } from "react";
import Image from "next/image";
import type {
    AwardTagData,
    ChatV2Attachment,
    ChatV2Message,
    ChatV2RoomMember,
} from "@/communication/chatV2/_types";
import AwardTag from "@/common/components/AwardTag/AwardTag";
import { getStandaloneGifUrl } from "@/communication/chatV2/gifUrl";
import { extractLinkParts } from "./MessageContentRenderer";
import { BotMessageCard } from "./BotCards/BotMessageCard";
import { PZEventCard } from "./BotCards/PZEventCard";
import { CallEventMessage } from "./CallEventMessage";
import { UnifiedLinkPreview } from "@/common/components/TextChat/UnifiedLinkPreview";
import UserAvatar from "./UserAvatar";
import MessageHoverActions from "./MessageHoverActions";
import InlineMessageEditor from "./InlineMessageEditor";
import MessageReactionChips from "./MessageReactionChips";
import MessageContentRenderer from "./MessageContentRenderer";
import { isEmojiOnly } from "@/common/utils/isEmojiOnly";
import { ExternalLink, Pin } from "lucide-react";
import { getDisplayName } from "@/common/utils/displayName";
import type { SenderAvatar } from "./profile-popover";
import type { LinkPreviewMetadata } from "@/common/hooks/useLinkPreviews";
import {
    formatChatDaySeparatorLabel,
    formatChatMessageTimestamp,
    formatGutterTimestamp,
    isSameMessageCalendarDay,
} from "@/common/utils/messageTimestamp";
import {
    extractMentionedUserIds,
} from "@/communication/chatV2/mentionUtils";
import type { MentionMemberNameMap } from "@/communication/chatV2/mentionUtils";
import { CallBadge } from "./CallBadge";
import { FileDownloadCard } from "./FileDownloadCard";
import { ExpiredFilePlaceholder } from "./ExpiredFilePlaceholder";

const isPreviewableAttachment = (attachment: ChatV2Attachment) =>
    attachment.isImage || attachment.mimeType === "application/pdf";

const hasImageContent = (message: ChatV2Message) =>
    message.messageType === "IMAGE" ||
    message.attachments.some((attachment) => attachment.isImage);

interface AttachmentUrlState {
    thumbnailUrl: string | null;
    viewUrl: string | null;
    showFull: boolean;
}

export interface MessageRowProps {
    message: ChatV2Message;
    previousMessage: ChatV2Message | null;
    threadReplies: ChatV2Message[];

    flyoutMessageId: string | null;
    editingMessageId: string | null;
    highlightedMessageId: string | null;
    pinnedMessageIds?: Map<string, { pinnedByName: string }>;

    localBackendUserId?: number;
    memberNameMap: MentionMemberNameMap;
    memberRoleColors?: Map<number, string>;
    awardTagMap?: Map<number, AwardTagData>;
    usersInCall: Set<number>;
    roomMembers: ChatV2RoomMember[];

    attachmentUrls: Record<string, AttachmentUrlState>;
    linkPreviews: Record<string, LinkPreviewMetadata | null>;

    getSenderName: (message: ChatV2Message) => string;
    getSenderAvatar: (message: ChatV2Message) => SenderAvatar;

    onOpenThread?: (rootMessageId: string) => void;
    onPinMessage?: (messageId: string) => void;
    onUnpinMessage?: (messageId: string) => void;
    onFlyoutChange: (messageId: string | null) => void;
    onProfilePopover: (
        event: React.MouseEvent<HTMLDivElement>,
        message: ChatV2Message,
        senderName: string,
        senderAvatar: SenderAvatar,
    ) => void;
    onAvatarContextMenu: (
        event: React.MouseEvent<HTMLDivElement>,
        message: ChatV2Message,
        senderName: string,
    ) => void;
    onMentionClick: (
        event: React.MouseEvent | React.KeyboardEvent,
        userId: number,
        displayName: string,
    ) => void;
    onImageClick: (fileId: string, fileName: string) => void;
    onGifClick: (gifUrl: string) => void;
    onDownloadAttachment: (fileId: string, filename: string) => void;
    onUnsendImage: (message: ChatV2Message) => void;
    onFutureAction: (label: string) => void;
    startEdit: (message: ChatV2Message) => void;
    cancelEdit: () => void;
    saveEdit: (messageId: string, content: string) => Promise<void>;
    toggleMessageReaction: (messageId: string, emoji: string) => Promise<void>;
}

const MessageRow = React.memo(function MessageRow({
    message,
    previousMessage,
    threadReplies,
    flyoutMessageId,
    editingMessageId,
    highlightedMessageId,
    pinnedMessageIds,
    localBackendUserId,
    memberNameMap,
    memberRoleColors,
    awardTagMap,
    usersInCall,
    roomMembers,
    attachmentUrls,
    linkPreviews,
    getSenderName,
    getSenderAvatar,
    onOpenThread,
    onPinMessage,
    onUnpinMessage,
    onFlyoutChange,
    onProfilePopover,
    onAvatarContextMenu,
    onMentionClick,
    onImageClick,
    onGifClick,
    onDownloadAttachment,
    onUnsendImage,
    onFutureAction,
    startEdit,
    cancelEdit,
    saveEdit,
    toggleMessageReaction,
}: MessageRowProps) {
    const messageReplyPreviewUsers = useMemo(() => {
        if (
            message.replyPreviewUsers &&
            message.replyPreviewUsers.length > 0
        ) {
            return message.replyPreviewUsers;
        }
        const previewUsers = new Map<
            number,
            { id: number; name: string | null; image: string | null }
        >();
        for (let i = threadReplies.length - 1; i >= 0; i -= 1) {
            const reply = threadReplies[i];
            if (!reply) continue;
            if (previewUsers.has(reply.senderUserId)) continue;
            previewUsers.set(reply.senderUserId, {
                id: reply.senderUserId,
                name: getDisplayName(reply.sender, `User ${reply.senderUserId}`),
                image: reply.sender?.image || null,
            });
            if (previewUsers.size >= 3) break;
        }
        return Array.from(previewUsers.values());
    }, [message.replyPreviewUsers, threadReplies]);

    const totalReplies = message.replyCount ?? threadReplies.length;
    const isThreadHighlighted = threadReplies.some(
        (reply) => reply.id === highlightedMessageId,
    );
    const senderName = getSenderName(message);
    const senderAvatar = getSenderAvatar(message);
    const isBot = message.messageType === "SYSTEM" && !!message.botCard;
    const isSlashCommand = !!message.content?.startsWith("/");
    const skipLinkPreviews = isBot || isSlashCommand;
    const canOpenAvatarMenu = !(
        typeof localBackendUserId === "number" &&
        message.senderUserId === localBackendUserId
    );
    const standaloneGifUrl =
        message.messageType === "IMAGE" && message.attachments.length === 0
            ? getStandaloneGifUrl(message.content)
            : null;
    const parsedMessageLinks =
        skipLinkPreviews || !message.content || standaloneGifUrl
            ? []
            : extractLinkParts(message.content);
    const parsedMessageLinkUrls = new Set(
        parsedMessageLinks.map((part) => part.url as string),
    );
    const extractedUrls = skipLinkPreviews
        ? []
        : Array.from(
              new Set(
                  (message.content?.match(/https?:\/\/[^\s]+/gi) || []).map(
                      (url) => url.trim(),
                  ),
              ),
          );
    const fallbackGenericUrls = extractedUrls.filter(
        (url) => !parsedMessageLinkUrls.has(url),
    );
    const effectiveMentionedUserIds =
        Array.isArray(message.mentionedUserIds) &&
        message.mentionedUserIds.length > 0
            ? message.mentionedUserIds
            : extractMentionedUserIds(message.content || "", memberNameMap);
    const isCurrentUserMentioned =
        typeof localBackendUserId === "number" &&
        effectiveMentionedUserIds.includes(localBackendUserId);
    const showDaySeparator =
        !previousMessage ||
        !isSameMessageCalendarDay(previousMessage.createdAt, message.createdAt);
    const isConsecutive =
        !showDaySeparator &&
        previousMessage !== null &&
        previousMessage.senderUserId === message.senderUserId;
    const daySeparatorLabel = showDaySeparator
        ? formatChatDaySeparatorLabel(message.createdAt)
        : "";

    return (
        <>
            {showDaySeparator && (
                <div
                    data-chat-day-separator={daySeparatorLabel}
                    className="my-1 flex items-center gap-3 px-1"
                >
                    <div className="flex-1 border-t wd-border-subtle" />
                    <span className="text-[11px] wd-text-muted">
                        {daySeparatorLabel}
                    </span>
                    <div className="flex-1 border-t wd-border-subtle" />
                </div>
            )}
            {message.messageType === "SYSTEM" &&
            message.metadata?.eventType === "call_participant_left" ? (
                <CallEventMessage message={message} />
            ) : (
                <div
                    data-chat-message-id={message.id}
                    className={`${(flyoutMessageId && flyoutMessageId !== message.id) || (editingMessageId && editingMessageId !== message.id) ? "" : "group"} flex gap-3 px-1 ${isConsecutive ? "py-0.5" : "pt-6 pb-1"} rounded-md transition-colors hover:bg-[var(--wd-surface-elevated)]/50 ${flyoutMessageId === message.id ? "relative z-[210]" : editingMessageId === message.id ? "relative z-[205]" : ""} ${
                        highlightedMessageId === message.id ||
                        isThreadHighlighted
                            ? "rounded-md bg-[var(--wd-accent-soft)]"
                            : isCurrentUserMentioned
                              ? "border-l-2 border-l-[rgb(var(--wd-warning-rgb))] bg-[rgb(var(--wd-warning-rgb)/0.06)]"
                              : pinnedMessageIds?.has(message.id)
                                ? "border-l-2 border-l-[var(--wd-accent)]"
                                : ""
                    }${editingMessageId === message.id ? " rounded-md bg-[var(--wd-accent-soft)]" : ""}`}
                >
                    {isConsecutive ? (
                        <div className="w-11 shrink-0 relative flex items-start justify-end pt-1">
                            <span className="absolute right-0 text-[10px] leading-none wd-text-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {formatGutterTimestamp(message.createdAt)}
                            </span>
                        </div>
                    ) : (
                        <div
                            onClick={(event) =>
                                onProfilePopover(
                                    event,
                                    message,
                                    senderName,
                                    senderAvatar,
                                )
                            }
                            onContextMenu={(event) =>
                                onAvatarContextMenu(event, message, senderName)
                            }
                            title={
                                canOpenAvatarMenu
                                    ? "Click to view profile. Right-click to add friend."
                                    : "Click to view profile"
                            }
                            className="cursor-pointer"
                        >
                            <UserAvatar
                                name={senderName}
                                spriteStyle={
                                    senderAvatar.mode === "sprite"
                                        ? senderAvatar.style
                                        : null
                                }
                                image={
                                    senderAvatar.mode === "image"
                                        ? senderAvatar.src
                                        : null
                                }
                                size="lg"
                                className="cursor-pointer"
                            />
                        </div>
                    )}

                    <div className="min-w-0 flex-1 relative">
                        {editingMessageId !== message.id && (
                            <MessageHoverActions
                                canReply={!message.replyToMessageId}
                                isPinned={
                                    pinnedMessageIds?.has(message.id) ?? false
                                }
                                onReply={() => {
                                    if (!message.replyToMessageId) {
                                        onOpenThread?.(message.id);
                                        return;
                                    }
                                    onFutureAction("Reply");
                                }}
                                onReact={(emoji) => {
                                    void toggleMessageReaction(
                                        message.id,
                                        emoji,
                                    );
                                }}
                                onEdit={
                                    typeof localBackendUserId === "number" &&
                                    message.senderUserId ===
                                        localBackendUserId &&
                                    !message.deletedAt &&
                                    message.messageType !== "SYSTEM" &&
                                    message.messageType !== "IMAGE" &&
                                    message.messageType !== "WEBHOOK"
                                        ? () => startEdit(message)
                                        : undefined
                                }
                                onUnsend={
                                    typeof localBackendUserId === "number" &&
                                    message.senderUserId ===
                                        localBackendUserId &&
                                    !message.deletedAt &&
                                    hasImageContent(message)
                                        ? () => onUnsendImage(message)
                                        : undefined
                                }
                                onTogglePin={
                                    pinnedMessageIds?.has(message.id)
                                        ? () => onUnpinMessage?.(message.id)
                                        : () => onPinMessage?.(message.id)
                                }
                                onFutureAction={onFutureAction}
                                onFlyoutChange={(open) =>
                                    onFlyoutChange(open ? message.id : null)
                                }
                            />
                        )}

                        {pinnedMessageIds?.has(message.id) && (
                            <div className="flex items-center gap-1 text-[11px] wd-text-muted mb-1">
                                <Pin size={11} /> Pinned by{" "}
                                {pinnedMessageIds.get(message.id)
                                    ?.pinnedByName ?? "unknown"}
                            </div>
                        )}

                        {!isConsecutive && (
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className={`text-sm font-medium ${memberRoleColors?.get(message.senderUserId) ? "" : "wd-text-primary"}`}
                                    style={
                                        memberRoleColors?.get(
                                            message.senderUserId,
                                        )
                                            ? {
                                                  color: memberRoleColors.get(
                                                      message.senderUserId,
                                                  ),
                                              }
                                            : undefined
                                    }
                                >
                                    {senderName}
                                </span>
                                {(() => {
                                    const senderAward = awardTagMap?.get(
                                        message.senderUserId,
                                    );
                                    return senderAward ? (
                                        <AwardTag
                                            type={senderAward.type}
                                            label={senderAward.label}
                                            size="xs"
                                        />
                                    ) : null;
                                })()}
                                {isBot && (
                                    <span className="inline-flex items-center rounded-[3px] bg-[var(--wd-bot-badge-bg)] px-[5px] py-px text-[0.625rem] font-semibold uppercase tracking-wide wd-text-accent">
                                        BOT
                                    </span>
                                )}
                                {usersInCall.has(message.senderUserId) && (
                                    <CallBadge />
                                )}
                                <span className="text-xs wd-text-muted">
                                    {formatChatMessageTimestamp(
                                        message.createdAt,
                                    )}
                                </span>
                                {message.editedAt && (
                                    <span className="text-[10px] uppercase tracking-wide wd-text-muted">
                                        edited
                                    </span>
                                )}
                            </div>
                        )}

                        {message.deletedAt ? (
                            <div className="text-sm wd-text-muted italic">
                                Message deleted
                            </div>
                        ) : editingMessageId === message.id ? (
                            <InlineMessageEditor
                                initialContent={message.content}
                                members={roomMembers}
                                onSave={async (content) => {
                                    await saveEdit(message.id, content);
                                }}
                                onCancel={cancelEdit}
                            />
                        ) : isBot && message.botCard ? (
                            <BotMessageCard message={message} />
                        ) : message.messageType === "WEBHOOK" &&
                          message.metadata?.eventType ? (
                            <PZEventCard
                                eventType={
                                    message.metadata.eventType as string
                                }
                                content={message.content}
                            />
                        ) : (
                            <div>
                                {standaloneGifUrl && (
                                    <div className="mt-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onGifClick(standaloneGifUrl)
                                            }
                                            className="relative block cursor-pointer group"
                                        >
                                            <Image
                                                src={standaloneGifUrl}
                                                alt="GIF"
                                                width={320}
                                                height={224}
                                                unoptimized
                                                className="rounded-md max-w-xs max-h-56 object-contain border wd-border-subtle"
                                            />
                                            <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                Click to expand
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {message.content && !standaloneGifUrl && (
                                    <div>
                                        <div
                                            className={`${isEmojiOnly(message.content) ? "text-4xl leading-snug" : "text-sm"} wd-text-secondary whitespace-pre-wrap break-words`}
                                        >
                                            <MessageContentRenderer
                                                content={message.content}
                                                messageId={message.id}
                                                mentionedUserIds={
                                                    effectiveMentionedUserIds
                                                }
                                                memberNameMap={memberNameMap}
                                                onClickMention={onMentionClick}
                                                skipLinkPreviews={
                                                    skipLinkPreviews
                                                }
                                            />
                                            {message.editedAt && (
                                                <span
                                                    className="ml-1 text-[10px] wd-text-muted"
                                                    title={`Edited ${formatChatMessageTimestamp(message.editedAt)}`}
                                                >
                                                    (edited)
                                                </span>
                                            )}
                                        </div>

                                        {(parsedMessageLinks.length > 0 ||
                                            fallbackGenericUrls.length > 0) && (
                                            <div className="mt-2">
                                                {parsedMessageLinks.map(
                                                    (part, i) => (
                                                        <UnifiedLinkPreview
                                                            key={`${message.id}-preview-${i}`}
                                                            url={part.url!}
                                                            platform={
                                                                part.type ===
                                                                "link"
                                                                    ? "generic"
                                                                    : (part.type as
                                                                          | "youtube"
                                                                          | "twitter"
                                                                          | "github"
                                                                          | "instagram"
                                                                          | "facebook")
                                                            }
                                                            metadata={
                                                                linkPreviews[
                                                                    part.url!
                                                                ]
                                                            }
                                                            platformHints={{
                                                                youtubeId:
                                                                    part.youtubeId,
                                                                githubType:
                                                                    part.githubType,
                                                            }}
                                                        />
                                                    ),
                                                )}

                                                {fallbackGenericUrls.map(
                                                    (url, i) => (
                                                        <UnifiedLinkPreview
                                                            key={`${message.id}-fallback-preview-${i}`}
                                                            url={url}
                                                            platform="generic"
                                                            metadata={
                                                                linkPreviews[
                                                                    url
                                                                ]
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {message.attachments.map(
                                            (attachment) => {
                                                if (attachment.expiredAt) {
                                                    return (
                                                        <ExpiredFilePlaceholder
                                                            key={attachment.id}
                                                            filename={
                                                                attachment.originalFileName
                                                            }
                                                            mimeType={
                                                                attachment.mimeType
                                                            }
                                                        />
                                                    );
                                                }

                                                const urlState =
                                                    attachmentUrls[
                                                        attachment.id
                                                    ];
                                                const isPdfAttachment =
                                                    attachment.mimeType ===
                                                    "application/pdf";
                                                const isPreviewable =
                                                    isPreviewableAttachment(
                                                        attachment,
                                                    );

                                                if (
                                                    isPreviewable &&
                                                    !urlState
                                                ) {
                                                    return (
                                                        <div
                                                            key={attachment.id}
                                                            className="rounded-md max-w-xs h-32 animate-pulse wd-bg-elevated border wd-border-subtle"
                                                        />
                                                    );
                                                }

                                                if (
                                                    attachment.isImage &&
                                                    urlState
                                                ) {
                                                    const showFull =
                                                        urlState.showFull &&
                                                        urlState.viewUrl;
                                                    const imgSrc = showFull
                                                        ? urlState.viewUrl!
                                                        : (urlState.thumbnailUrl ??
                                                          urlState.viewUrl ??
                                                          "");
                                                    const isThumbnail =
                                                        !showFull &&
                                                        !!urlState.thumbnailUrl;

                                                    return (
                                                        <button
                                                            key={attachment.id}
                                                            type="button"
                                                            onClick={() =>
                                                                onImageClick(
                                                                    attachment.id,
                                                                    attachment.originalFileName,
                                                                )
                                                            }
                                                            className="relative block cursor-pointer group"
                                                        >
                                                            <Image
                                                                src={imgSrc}
                                                                alt={
                                                                    attachment.originalFileName
                                                                }
                                                                width={320}
                                                                height={224}
                                                                unoptimized
                                                                className="rounded-md max-w-xs max-h-56 object-cover border wd-border-subtle"
                                                            />
                                                            {isThumbnail && (
                                                                <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    Click for
                                                                    full size
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                }

                                                if (
                                                    isPdfAttachment &&
                                                    urlState?.viewUrl
                                                ) {
                                                    return (
                                                        <div
                                                            key={attachment.id}
                                                            className="space-y-1"
                                                        >
                                                            <iframe
                                                                src={
                                                                    urlState.viewUrl
                                                                }
                                                                title={
                                                                    attachment.originalFileName
                                                                }
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
                                                                className="text-xs px-2 py-1 rounded wd-bg-elevated wd-text-accent truncate inline-flex items-center gap-1 border wd-border-subtle"
                                                            >
                                                                {
                                                                    attachment.originalFileName
                                                                }
                                                                <ExternalLink
                                                                    size={12}
                                                                />
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <FileDownloadCard
                                                        key={attachment.id}
                                                        filename={
                                                            attachment.originalFileName
                                                        }
                                                        mimeType={
                                                            attachment.mimeType
                                                        }
                                                        sizeBytes={
                                                            attachment.sizeBytes
                                                        }
                                                        onDownload={() =>
                                                            onDownloadAttachment(
                                                                attachment.id,
                                                                attachment.originalFileName,
                                                            )
                                                        }
                                                    />
                                                );
                                            },
                                        )}
                                    </div>
                                )}

                                <MessageReactionChips
                                    roomId={message.roomId}
                                    messageId={message.id}
                                    reactions={message.reactions || []}
                                    onToggleReaction={(emoji) => {
                                        void toggleMessageReaction(
                                            message.id,
                                            emoji,
                                        );
                                    }}
                                />

                                {totalReplies > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onOpenThread?.(message.id)
                                        }
                                        className="mt-2 ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold wd-text-accent hover:bg-[var(--wd-accent-soft)]"
                                    >
                                        <span className="inline-flex items-center">
                                            {messageReplyPreviewUsers
                                                .slice(0, 3)
                                                .map((previewUser, i) => {
                                                    const previewDisplayName =
                                                        getDisplayName(
                                                            previewUser,
                                                            `User ${previewUser.id}`,
                                                        );
                                                    return (
                                                        <span
                                                            key={`${message.id}-reply-preview-${previewUser.id}`}
                                                            className={`${
                                                                i === 0
                                                                    ? ""
                                                                    : "-ml-1.5"
                                                            } h-5 w-5 rounded-full border wd-border-strong wd-bg-elevated overflow-hidden inline-flex items-center justify-center text-[10px] font-semibold wd-text-primary`}
                                                        >
                                                            {previewUser.image ? (
                                                                <Image
                                                                    src={
                                                                        previewUser.image
                                                                    }
                                                                    alt={
                                                                        previewDisplayName
                                                                    }
                                                                    width={20}
                                                                    height={20}
                                                                    unoptimized
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                previewDisplayName
                                                                    .charAt(0)
                                                                    .toUpperCase()
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                        </span>
                                        <span>
                                            {totalReplies}{" "}
                                            {totalReplies === 1
                                                ? "reply"
                                                : "replies"}
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
});

export default MessageRow;
