import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatV2Message } from "@/communication/chatV2/_types";
import { getStandaloneGifUrl } from "@/communication/chatV2/gifUrl";
import { getSignedAttachmentUrl } from "@/communication/chatV2/uploadService";
import useUserStore from "@/common/store/useStore";

interface MessageListProps {
    messages: ChatV2Message[];
    isLoading: boolean;
}

const formatTime = (value: string | Date) =>
    new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

function MessageList({ messages, isLoading }: MessageListProps) {
    const endRef = useRef<HTMLDivElement>(null);
    const user = useUserStore((state) => state.user);
    const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
        {},
    );
    const localBackendUserId =
        typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;
    const localDisplayName = user.name?.trim() || window.__BACKEND_USER__?.name || "";
    const localSpriteSheet = user.spriteSheetDataUrl?.trim() || "";
    const localProfileImage = user.image?.trim() || window.__BACKEND_USER__?.image || "";

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

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

                    return (
                        <div key={message.id} className="flex gap-3">
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
                                            <div className="text-sm wd-text-secondary whitespace-pre-wrap break-words">
                                                {message.content}
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
