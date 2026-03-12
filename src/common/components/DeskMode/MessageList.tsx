import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import type {
    ChatV2Attachment,
    ChatV2FriendshipStatus,
    ChatV2Message,
} from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { getStandaloneGifUrl } from "@/communication/chatV2/gifUrl";
import {
    downloadChatFile,
    getChatFilePreviewUrl,
    getChatFileThumbnailUrl,
} from "@/communication/chatV2/uploadService";
import { parseMessageContent } from "@/common/utils/linkParser";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { UnifiedLinkPreview } from "@/common/components/TextChat/UnifiedLinkPreview";
import { useLinkPreviews } from "@/common/hooks/useLinkPreviews";
import {
    buildMemberNameMap,
    extractMentionedUserIds,
    getMemberDisplayName,
} from "@/communication/chatV2/mentionUtils";
import MessageSkeleton from "./MessageSkeleton";
import UserAvatar from "./UserAvatar";
import MessageHoverActions from "./MessageHoverActions";
import InlineMessageEditor from "./InlineMessageEditor";
import MessageReactionChips from "./MessageReactionChips";
import MentionHighlightedContent from "./MentionHighlightedContent";
import useMessageEdit from "@/common/hooks/useMessageEdit";
import {
    ArrowDown,
    ExternalLink,
    Pin,
    UserCheck,
    UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import { getDisplayName } from "@/common/utils/displayName";
import { ProfilePopover } from "./profile-popover";
import type { ProfilePopoverState, SenderAvatar } from "./profile-popover";
import {
    formatChatDaySeparatorLabel,
    formatChatMessageTimestamp,
    formatGutterTimestamp,
    isSameMessageCalendarDay,
} from "@/common/utils/messageTimestamp";
import {
    generateCharacterFaceDataUrl,
    toCharacterCustomization,
} from "@/common/utils/characterFaceAvatar";
import { getMusicBotAvatarSync } from "@/common/utils/botAvatar";

interface MessageListProps {
    messages: ChatV2Message[];
    isLoading: boolean;
    focusedMessageId?: string | null;
    onOpenThread?: (rootMessageId: string) => void;
    isLoadingOlderMessages?: boolean;
    hasMoreMessages?: boolean;
    onLoadOlderMessages?: () => void;
    memberRoleColors?: Map<number, string>;
    pinnedMessageIds?: Map<string, { pinnedByName: string }>;
    onPinMessage?: (messageId: string) => void;
    onUnpinMessage?: (messageId: string) => void;
}

type AvatarContextMenuState = {
    x: number;
    y: number;
    senderUserId: number;
    senderName: string;
};

const isPreviewableAttachment = (attachment: ChatV2Attachment) =>
    attachment.isImage || attachment.mimeType === "application/pdf";
const hasImageContent = (message: ChatV2Message) =>
    message.messageType === "IMAGE" ||
    message.attachments.some((attachment) => attachment.isImage);

const getFriendActionMeta = (
    friendshipStatus: ChatV2FriendshipStatus | null,
) => {
    if (friendshipStatus === "ACCEPTED") {
        return {
            isDisabled: true,
            label: "Already Friends",
            tooltip: "You're already friends.",
            isAccepted: true,
        };
    }

    if (friendshipStatus === "PENDING") {
        return {
            isDisabled: true,
            label: "Request Pending",
            tooltip: "Friend request is pending.",
            isAccepted: false,
        };
    }

    if (friendshipStatus === "BLOCKED") {
        return {
            isDisabled: true,
            label: "Blocked",
            tooltip: "Friend requests are blocked.",
            isAccepted: false,
        };
    }

    return {
        isDisabled: false,
        label: "Add Friend",
        tooltip: "Add friend",
        isAccepted: false,
    };
};

const getSenderAvatarForMessage = (
    message: ChatV2Message,
    input: {
        localBackendUserId?: number;
        localSpriteSheet: string;
        localProfileImage: string;
        resolvedSenderImagesByUserId?: Record<number, string>;
    },
): SenderAvatar => {
    if (message.sender?.name === "Music Bot") {
        const botAvatar = getMusicBotAvatarSync();
        if (botAvatar) return { mode: "image", src: botAvatar };
    }

    const isLocalSender =
        input.localBackendUserId !== undefined &&
        message.senderUserId === input.localBackendUserId;

    if (isLocalSender && input.localProfileImage) {
        return { mode: "image", src: input.localProfileImage };
    }

    if (isLocalSender && input.localSpriteSheet) {
        return {
            mode: "sprite",
            style: {
                backgroundImage: `url('${input.localSpriteSheet}')`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "-94px -20px",
                imageRendering: "pixelated",
            },
        };
    }

    const profileImage = message.sender?.image?.trim();
    if (profileImage) {
        return { mode: "image", src: profileImage };
    }

    const resolvedImage =
        input.resolvedSenderImagesByUserId?.[message.senderUserId]?.trim();
    if (resolvedImage) {
        if (resolvedImage.startsWith("data:")) {
            return {
                mode: "sprite",
                style: {
                    backgroundImage: `url('${resolvedImage}')`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center -20px",
                    imageRendering: "pixelated",
                },
            };
        }
        return { mode: "image", src: resolvedImage };
    }

    return { mode: "fallback" };
};

function MessageList({
    messages,
    isLoading,
    focusedMessageId = null,
    onOpenThread,
    isLoadingOlderMessages = false,
    hasMoreMessages = true,
    onLoadOlderMessages,
    memberRoleColors,
    pinnedMessageIds,
    onPinMessage,
    onUnpinMessage,
}: MessageListProps) {
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const isLoadingOlderRef = useRef(false);
    const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
    const [isScrolledFarBack, setIsScrolledFarBack] = useState(false);
    const user = useUserStore((state) => state.user);
    const backendUser = useUserStore((s) => s.backendUser);
    const friends = useChatV2Store((state) => state.friends);
    const friendRequests = useChatV2Store((state) => state.friendRequests);
    const requestFriend = useChatV2Store((state) => state.requestFriend);
    const currentRoomId = useChatV2Store((state) => state.currentRoomId);
    const membersByRoomId = useChatV2Store((state) => state.membersByRoomId);
    const toggleMessageReaction = useChatV2Store(
        (state) => state.toggleMessageReaction,
    );
    const [attachmentUrls, setAttachmentUrls] = useState<
        Record<
            string,
            {
                thumbnailUrl: string | null;
                viewUrl: string | null;
                showFull: boolean;
            }
        >
    >({});
    const linkPreviews = useLinkPreviews(messages);
    const [highlightedMessageId, setHighlightedMessageId] = useState<
        string | null
    >(null);
    const [avatarContextMenu, setAvatarContextMenu] =
        useState<AvatarContextMenuState | null>(null);
    const [profilePopover, setProfilePopover] =
        useState<ProfilePopoverState | null>(null);
    const [isAddingFriend, setIsAddingFriend] = useState(false);
    const [flyoutMessageId, setFlyoutMessageId] = useState<string | null>(null);
    const [resolvedSenderImagesByUserId, setResolvedSenderImagesByUserId] =
        useState<Record<number, string>>({});
    const [
        avatarImageLookupStatusByUserId,
        setAvatarImageLookupStatusByUserId,
    ] = useState<Record<number, "pending" | "done">>({});
    const localBackendUserId = backendUser?.id;
    const localDisplayName = getDisplayName(
        {
            nickname:
                user.nickname ?? backendUser?.nickname ?? null,
            name: user.name || backendUser?.name || null,
        },
        "",
    );
    const localSpriteSheet = user.spriteSheetDataUrl?.trim() || "";
    const localProfileImage =
        user.image?.trim() || backendUser?.image?.trim() || "";
    const acceptedFriendUserIds = useMemo(
        () =>
            new Set(
                friends
                    .filter((friend) => friend.status === "ACCEPTED")
                    .map((friend) => friend.peerUser.id),
            ),
        [friends],
    );
    const pendingFriendUserIds = useMemo(
        () =>
            new Set(
                friendRequests
                    .filter((request) => request.status === "PENDING")
                    .map((request) => request.peerUser.id),
            ),
        [friendRequests],
    );
    const avatarContextFriendshipStatus =
        useMemo<ChatV2FriendshipStatus | null>(() => {
            if (!avatarContextMenu) return null;

            const targetUserId = avatarContextMenu.senderUserId;
            if (acceptedFriendUserIds.has(targetUserId)) return "ACCEPTED";
            if (pendingFriendUserIds.has(targetUserId)) return "PENDING";
            return null;
        }, [acceptedFriendUserIds, avatarContextMenu, pendingFriendUserIds]);
    const avatarFriendActionMeta = useMemo(
        () => getFriendActionMeta(avatarContextFriendshipStatus),
        [avatarContextFriendshipStatus],
    );
    const roomMembers = currentRoomId
        ? membersByRoomId[currentRoomId] || []
        : [];
    const memberNameMap = useMemo(
        () => buildMemberNameMap(roomMembers),
        [roomMembers],
    );
    const lastMessageId = useMemo(
        () => messages[messages.length - 1]?.id || "",
        [messages],
    );
    const { editingMessageId, startEdit, cancelEdit, saveEdit } =
        useMessageEdit(currentRoomId);

    // Reset scroll position when switching rooms (column-reverse: 0 = bottom)
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
        setShowNewMessagesPill(false);
        setIsScrolledFarBack(false);
    }, [currentRoomId]);

    // When new messages arrive, auto-scroll if near bottom or sent by local user
    useEffect(() => {
        if (focusedMessageId || isLoading) {
            return;
        }
        if (isLoadingOlderRef.current) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        const lastMessage = messages[messages.length - 1];
        const isSentByLocalUser =
            typeof localBackendUserId === "number" &&
            lastMessage?.senderUserId === localBackendUserId;

        // In column-reverse, scrollTop is 0 at bottom and negative upward
        const distanceFromBottom = Math.abs(container.scrollTop);
        const isNearBottom = distanceFromBottom < 100;

        if (isNearBottom || isSentByLocalUser) {
            container.scrollTop = 0;
        } else {
            setShowNewMessagesPill(true);
        }
    }, [focusedMessageId, isLoading, lastMessageId, localBackendUserId, messages]);

    // IntersectionObserver for lazy loading older messages
    useEffect(() => {
        const sentinel = topSentinelRef.current;
        const container = scrollContainerRef.current;
        if (!sentinel || !container || !onLoadOlderMessages) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry?.isIntersecting && !isLoadingOlderRef.current) {
                    onLoadOlderMessages();
                }
            },
            {
                root: container,
                rootMargin: "250px 0px 0px 0px",
                threshold: 0,
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [onLoadOlderMessages]);

    // Sync loading ref for observer guard
    useEffect(() => {
        isLoadingOlderRef.current = isLoadingOlderMessages;
    }, [isLoadingOlderMessages]);

    // column-reverse handles scroll anchoring natively when older messages prepend

    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
        setShowNewMessagesPill(false);
        setIsScrolledFarBack(false);
    }, []);

    // Track scroll position for pill and scroll-to-latest button
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const onScroll = () => {
            // In column-reverse, scrollTop is 0 at bottom and negative upward
            const distanceFromBottom = Math.abs(container.scrollTop);
            if (distanceFromBottom < 100) {
                setShowNewMessagesPill(false);
            }
            setIsScrolledFarBack(distanceFromBottom > 600);
        };

        container.addEventListener("scroll", onScroll, { passive: true });
        return () => container.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!avatarContextMenu && !profilePopover) {
            return undefined;
        }

        const closeMenu = () => {
            setAvatarContextMenu(null);
            setProfilePopover(null);
        };

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-avatar-context-menu='true']")) {
                return;
            }
            if (target?.closest("[data-user-profile-popover='true']")) {
                return;
            }
            if (target?.closest("[data-user-profile-more='true']")) {
                return;
            }
            closeMenu();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeMenu();
            }
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", closeMenu, true);
        window.addEventListener("resize", closeMenu);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", closeMenu, true);
            window.removeEventListener("resize", closeMenu);
        };
    }, [avatarContextMenu, profilePopover]);

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
        if (!focusedMessageId) {
            return;
        }

        const targetNode = document.querySelector(
            `[data-chat-message-id="${focusedMessageId}"]`,
        );
        if (targetNode instanceof HTMLElement) {
            return;
        }

        if (hasMoreMessages && !isLoadingOlderMessages) {
            onLoadOlderMessages?.();
        }
    }, [
        focusedMessageId,
        messages,
        hasMoreMessages,
        isLoadingOlderMessages,
        onLoadOlderMessages,
    ]);

    useEffect(() => {
        const unresolvedAttachments: Array<{
            fileId: string;
            isImage: boolean;
        }> = [];

        for (const message of messages) {
            for (const attachment of message.attachments) {
                if (
                    isPreviewableAttachment(attachment) &&
                    !attachmentUrls[attachment.id]
                ) {
                    unresolvedAttachments.push({
                        fileId: attachment.id,
                        isImage: attachment.isImage,
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
                        if (attachment.isImage) {
                            const thumbnailUrl = await getChatFileThumbnailUrl(
                                attachment.fileId,
                            );
                            if (thumbnailUrl) {
                                return {
                                    fileId: attachment.fileId,
                                    thumbnailUrl,
                                    viewUrl: null,
                                } as const;
                            }
                        }
                        const viewUrl = await getChatFilePreviewUrl(
                            attachment.fileId,
                        );
                        return {
                            fileId: attachment.fileId,
                            thumbnailUrl: null,
                            viewUrl,
                        } as const;
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
                    next[entry.fileId] = {
                        thumbnailUrl: entry.thumbnailUrl,
                        viewUrl: entry.viewUrl,
                        showFull: false,
                    };
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [attachmentUrls, messages]);

    const processedCharacterUserIds = useRef(new Set<number>());

    useEffect(() => {
        const inlineCharacterSenders = messages.filter((message) => {
            if (!Number.isInteger(message.senderUserId)) return false;
            if (
                typeof localBackendUserId === "number" &&
                message.senderUserId === localBackendUserId
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

            void generateCharacterFaceDataUrl(
                toCharacterCustomization(cc),
            ).then((url) => {
                if (url) {
                    setResolvedSenderImagesByUserId((prev) => ({
                        ...prev,
                        [message.senderUserId]: url,
                    }));
                }
            });
        }
    }, [messages, localBackendUserId]);

    useEffect(() => {
        const unresolvedSenderUserIds = Array.from(
            new Set(
                messages
                    .filter((message) => {
                        if (!Number.isInteger(message.senderUserId))
                            return false;
                        if (
                            typeof localBackendUserId === "number" &&
                            message.senderUserId === localBackendUserId
                        ) {
                            return false;
                        }
                        if (message.sender?.image?.trim()) return false;
                        if (resolvedSenderImagesByUserId[message.senderUserId])
                            return false;
                        if (
                            avatarImageLookupStatusByUserId[
                                message.senderUserId
                            ] === "pending"
                        ) {
                            return false;
                        }
                        if (
                            avatarImageLookupStatusByUserId[
                                message.senderUserId
                            ] === "done"
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
                            toCharacterCustomization(
                                profile.user.characterCustomization,
                            ),
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
                    // Profile resolution is best-effort for avatar rendering fallback.
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
        avatarImageLookupStatusByUserId,
        chatV2Service,
        localBackendUserId,
        messages,
        resolvedSenderImagesByUserId,
    ]);

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
    const groupedMessages = useMemo(() => {
        const rootMessages: ChatV2Message[] = [];
        const repliesByRootId = new Map<string, ChatV2Message[]>();

        for (const message of orderedMessages) {
            if (!message.replyToMessageId) {
                rootMessages.push(message);
                continue;
            }

            const existingReplies =
                repliesByRootId.get(message.replyToMessageId) || [];
            existingReplies.push(message);
            repliesByRootId.set(message.replyToMessageId, existingReplies);
        }

        return {
            rootMessages,
            repliesByRootId,
        };
    }, [orderedMessages]);

    const getSenderName = (message: ChatV2Message) => {
        const isLocalSender =
            localBackendUserId !== undefined &&
            message.senderUserId === localBackendUserId;
        if (isLocalSender && localDisplayName) {
            return localDisplayName;
        }
        return getDisplayName(message.sender, `User ${message.senderUserId}`);
    };

    const getSenderAvatar = (message: ChatV2Message) => {
        return getSenderAvatarForMessage(message, {
            localBackendUserId,
            localSpriteSheet,
            localProfileImage,
            resolvedSenderImagesByUserId,
        });
    };

    const handleImageClick = (fileId: string) => {
        const current = attachmentUrls[fileId];
        if (current?.viewUrl) {
            setAttachmentUrls((prev) => ({
                ...prev,
                [fileId]: { ...current, showFull: true },
            }));
            return;
        }
        void (async () => {
            try {
                const viewUrl = await getChatFilePreviewUrl(fileId);
                setAttachmentUrls((prev) => ({
                    ...prev,
                    [fileId]: {
                        thumbnailUrl: prev[fileId]?.thumbnailUrl ?? null,
                        viewUrl,
                        showFull: true,
                    },
                }));
            } catch {
                // Silently fail - user can try clicking again
            }
        })();
    };

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

    const openAvatarContextMenu = (
        event: React.MouseEvent<HTMLDivElement>,
        message: ChatV2Message,
        senderName: string,
    ) => {
        if (
            typeof localBackendUserId === "number" &&
            message.senderUserId === localBackendUserId
        ) {
            return;
        }
        if (
            !Number.isInteger(message.senderUserId) ||
            message.senderUserId <= 0
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const menuWidth = 214;
        const menuHeight = 46;
        const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
        const maxY = Math.max(8, window.innerHeight - menuHeight - 8);

        setAvatarContextMenu({
            x: Math.min(event.clientX, maxX),
            y: Math.min(event.clientY, maxY),
            senderUserId: message.senderUserId,
            senderName,
        });

        setProfilePopover(null);
    };

    const handleMentionClick = (
        event: React.MouseEvent,
        userId: number,
        displayName: string,
    ) => {
        if (!Number.isInteger(userId) || userId <= 0) return;

        event.preventDefault();
        event.stopPropagation();

        const popoverWidth = 360;
        const popoverHeight = 420;
        const maxX = Math.max(8, window.innerWidth - popoverWidth - 8);
        const maxY = Math.max(8, window.innerHeight - popoverHeight - 8);
        const desiredX = event.clientX + 12;
        const desiredY = event.clientY - 16;
        const resolvedDisplayName =
            getMemberDisplayName(memberNameMap, userId) || displayName;

        let senderAvatar: SenderAvatar;
        const resolvedImage = resolvedSenderImagesByUserId[userId];
        if (resolvedImage) {
            senderAvatar = { mode: "image", src: resolvedImage };
        } else {
            const member = roomMembers.find((m) => m.user.id === userId);
            const memberImage = member?.user.image?.trim();
            if (memberImage) {
                senderAvatar = { mode: "image", src: memberImage };
            } else {
                senderAvatar = { mode: "fallback" };
            }
        }

        setProfilePopover({
            x: Math.min(desiredX, maxX),
            y: Math.min(Math.max(8, desiredY), maxY),
            senderUserId: userId,
            senderName: resolvedDisplayName,
            senderAvatar,
        });
        setAvatarContextMenu(null);
    };

    const openProfilePopover = (
        event: React.MouseEvent<HTMLDivElement>,
        message: ChatV2Message,
        senderName: string,
        senderAvatar: SenderAvatar,
    ) => {
        if (
            !Number.isInteger(message.senderUserId) ||
            message.senderUserId <= 0
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const popoverWidth = 360;
        const popoverHeight = 420;
        const maxX = Math.max(8, window.innerWidth - popoverWidth - 8);
        const maxY = Math.max(8, window.innerHeight - popoverHeight - 8);
        const desiredX = event.clientX + 12;
        const desiredY = event.clientY - 16;

        setProfilePopover({
            x: Math.min(desiredX, maxX),
            y: Math.min(Math.max(8, desiredY), maxY),
            senderUserId: message.senderUserId,
            senderName,
            senderAvatar,
        });
        setAvatarContextMenu(null);
    };

    const handleAddFriend = async (
        userId: number,
        senderName: string,
        closeMenus = false,
    ) => {
        if (isAddingFriend) {
            return;
        }

        setIsAddingFriend(true);
        try {
            await requestFriend(userId);
            toast("Friend request sent", {
                description: `Sent to ${senderName}.`,
            });
        } catch (error) {
            toast("Unable to send friend request", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
            });
        } finally {
            setIsAddingFriend(false);
            if (closeMenus) {
                setAvatarContextMenu(null);
                setProfilePopover(null);
            }
        }
    };

    const handleFutureMessageAction = (label: string) => {
        toast(`${label} is coming soon`, {
            description: "This action is a placeholder for now.",
        });
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
        <div
            ref={scrollContainerRef}
            className="relative no-scrollbar flex-1 overflow-y-auto flex flex-col-reverse wd-bg-panel-2"
        >
            <div className="px-5 py-4 space-y-3">
            {isLoading ? (
                <MessageSkeleton count={8} />
            ) : groupedMessages.rootMessages.length === 0 ? (
                <div className="text-xs wd-text-muted">
                    No messages yet. Start the room conversation.
                </div>
            ) : (
                <>
                    <div ref={topSentinelRef} className="h-px" />
                    {isLoadingOlderMessages && <MessageSkeleton count={3} />}
                    {!hasMoreMessages && !isLoadingOlderMessages && (
                        <div className="pb-4 pt-2 text-center text-xs wd-text-muted">
                            This is the beginning of the conversation
                        </div>
                    )}
                    {groupedMessages.rootMessages.map((message, index) => {
                        const threadReplies =
                            groupedMessages.repliesByRootId.get(message.id) ||
                            [];
                        const messageReplyPreviewUsers =
                            message.replyPreviewUsers &&
                            message.replyPreviewUsers.length > 0
                                ? message.replyPreviewUsers
                                : (() => {
                                      const previewUsers = new Map<
                                          number,
                                          {
                                              id: number;
                                              name: string | null;
                                              image: string | null;
                                          }
                                      >();
                                      for (
                                          let index = threadReplies.length - 1;
                                          index >= 0;
                                          index -= 1
                                      ) {
                                          const reply = threadReplies[index];
                                          if (!reply) continue;
                                          if (
                                              previewUsers.has(
                                                  reply.senderUserId,
                                              )
                                          )
                                              continue;
                                          previewUsers.set(reply.senderUserId, {
                                              id: reply.senderUserId,
                                              name: getDisplayName(
                                                  reply.sender,
                                                  `User ${reply.senderUserId}`,
                                              ),
                                              image:
                                                  reply.sender?.image || null,
                                          });
                                          if (previewUsers.size >= 3) break;
                                      }
                                      return Array.from(previewUsers.values());
                                  })();
                        const totalReplies =
                            message.replyCount ?? threadReplies.length;
                        const isThreadHighlighted = threadReplies.some(
                            (reply) => reply.id === highlightedMessageId,
                        );
                        const senderName = getSenderName(message);
                        const senderAvatar = getSenderAvatar(message);
                        const isBot = message.sender?.name === "Music Bot";
                        const isSlashCommand = !!message.content?.startsWith("/");
                        const skipLinkPreviews = isBot || isSlashCommand;
                        const canOpenAvatarMenu = !(
                            typeof localBackendUserId === "number" &&
                            message.senderUserId === localBackendUserId
                        );
                        const standaloneGifUrl =
                            message.messageType === "IMAGE" &&
                            message.attachments.length === 0
                                ? getStandaloneGifUrl(message.content)
                                : null;
                        const parsedMessageParts =
                            message.content && !standaloneGifUrl
                                ? parseMessageContent(message.content)
                                : [];
                        const parsedMessageLinks = skipLinkPreviews
                            ? []
                            : parsedMessageParts.filter(
                                  (part) => part.type !== "text" && !!part.url,
                              );
                        const parsedMessageLinkUrls = new Set(
                            parsedMessageLinks.map(
                                (part) => part.url as string,
                            ),
                        );
                        const extractedUrls = skipLinkPreviews
                            ? []
                            : Array.from(
                                  new Set(
                                      (
                                          message.content?.match(
                                              /https?:\/\/[^\s]+/gi,
                                          ) || []
                                      ).map((url) => url.trim()),
                                  ),
                              );
                        const fallbackGenericUrls = extractedUrls.filter(
                            (url) => !parsedMessageLinkUrls.has(url),
                        );

                        const effectiveMentionedUserIds =
                            Array.isArray(message.mentionedUserIds) &&
                            message.mentionedUserIds.length > 0
                                ? message.mentionedUserIds
                                : extractMentionedUserIds(
                                      message.content || "",
                                      memberNameMap,
                                  );
                        const isCurrentUserMentioned =
                            typeof localBackendUserId === "number" &&
                            effectiveMentionedUserIds.includes(
                                localBackendUserId,
                            );
                        const previousMessage =
                            index > 0
                                ? groupedMessages.rootMessages[index - 1]
                                : null;
                        const showDaySeparator =
                            !previousMessage ||
                            !isSameMessageCalendarDay(
                                previousMessage.createdAt,
                                message.createdAt,
                            );
                        const isConsecutive =
                            !showDaySeparator &&
                            previousMessage !== null &&
                            previousMessage.senderUserId ===
                                message.senderUserId;
                        const daySeparatorLabel = showDaySeparator
                            ? formatChatDaySeparatorLabel(message.createdAt)
                            : "";

                        return (
                            <React.Fragment key={message.id}>
                                {showDaySeparator && (
                                    <div
                                        data-chat-day-separator={
                                            daySeparatorLabel
                                        }
                                        className="my-1 flex items-center gap-3 px-1"
                                    >
                                        <div className="flex-1 border-t wd-border-subtle" />
                                        <span className="text-[11px] wd-text-muted">
                                            {daySeparatorLabel}
                                        </span>
                                        <div className="flex-1 border-t wd-border-subtle" />
                                    </div>
                                )}
                                <div
                                    data-chat-message-id={message.id}
                                    className={`${(flyoutMessageId && flyoutMessageId !== message.id) || (editingMessageId && editingMessageId !== message.id) ? "" : "group"} flex gap-3 px-1 ${isConsecutive ? "py-0.5" : "py-1"} transition-colors ${flyoutMessageId === message.id ? "relative z-[210]" : editingMessageId === message.id ? "relative z-[205]" : ""} ${
                                        highlightedMessageId === message.id ||
                                        isThreadHighlighted
                                            ? "rounded-md bg-[var(--wd-accent-soft)]"
                                            : isCurrentUserMentioned
                                              ? "border-l-2 border-l-[rgb(240,185,11)] bg-[rgba(240,185,11,0.06)]"
                                              : pinnedMessageIds?.has(
                                                      message.id,
                                                  )
                                                ? "border-l-2 border-l-[var(--wd-accent)]"
                                                : isBot
                                                  ? "border-l-[3px] border-l-[var(--wd-bot-border)] bg-[var(--wd-bot-bg)] hover:bg-[var(--wd-bot-bg-hover)]"
                                                  : ""
                                    }${editingMessageId === message.id ? " rounded-md bg-[var(--wd-accent-soft)]" : ""}`}
                                >
                                    {isConsecutive ? (
                                        <div className="w-9 shrink-0 relative flex items-start justify-end pt-1">
                                            <span className="absolute right-0 text-[10px] leading-none wd-text-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                {formatGutterTimestamp(
                                                    message.createdAt,
                                                )}
                                            </span>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={(event) =>
                                                openProfilePopover(
                                                    event,
                                                    message,
                                                    senderName,
                                                    senderAvatar,
                                                )
                                            }
                                            onContextMenu={(event) =>
                                                openAvatarContextMenu(
                                                    event,
                                                    message,
                                                    senderName,
                                                )
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
                                                    senderAvatar.mode ===
                                                    "sprite"
                                                        ? senderAvatar.style
                                                        : null
                                                }
                                                image={
                                                    senderAvatar.mode ===
                                                    "image"
                                                        ? senderAvatar.src
                                                        : null
                                                }
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1 relative">
                                        {editingMessageId !== message.id && (
                                        <MessageHoverActions
                                            canReply={!message.replyToMessageId}
                                            isPinned={
                                                pinnedMessageIds?.has(
                                                    message.id,
                                                ) ?? false
                                            }
                                            onReply={() => {
                                                if (!message.replyToMessageId) {
                                                    onOpenThread?.(message.id);
                                                    return;
                                                }
                                                handleFutureMessageAction(
                                                    "Reply",
                                                );
                                            }}
                                            onReact={(emoji) => {
                                                void toggleMessageReaction(
                                                    message.id,
                                                    emoji,
                                                );
                                            }}
                                            onEdit={
                                                typeof localBackendUserId ===
                                                    "number" &&
                                                message.senderUserId ===
                                                    localBackendUserId &&
                                                !message.deletedAt &&
                                                message.messageType !== "SYSTEM" &&
                                                message.messageType !== "IMAGE"
                                                    ? () => startEdit(message)
                                                    : undefined
                                            }
                                            onUnsend={
                                                typeof localBackendUserId ===
                                                    "number" &&
                                                message.senderUserId ===
                                                    localBackendUserId &&
                                                !message.deletedAt &&
                                                hasImageContent(message)
                                                    ? () =>
                                                          handleUnsendImage(
                                                              message,
                                                          )
                                                    : undefined
                                            }
                                            onTogglePin={
                                                pinnedMessageIds?.has(
                                                    message.id,
                                                )
                                                    ? () =>
                                                          onUnpinMessage?.(
                                                              message.id,
                                                          )
                                                    : () =>
                                                          onPinMessage?.(
                                                              message.id,
                                                          )
                                            }
                                            onFutureAction={
                                                handleFutureMessageAction
                                            }
                                            onFlyoutChange={(open) =>
                                                setFlyoutMessageId(open ? message.id : null)
                                            }
                                        />
                                        )}

                                        {pinnedMessageIds?.has(message.id) && (
                                            <div className="flex items-center gap-1 text-[11px] wd-text-muted mb-1">
                                                <Pin size={11} /> Pinned by{" "}
                                                {pinnedMessageIds.get(
                                                    message.id,
                                                )?.pinnedByName ?? "unknown"}
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
                                                {isBot && (
                                                    <span className="inline-flex items-center rounded-[3px] bg-[var(--wd-bot-badge-bg)] px-[5px] py-px text-[0.625rem] font-semibold uppercase tracking-wide wd-text-accent">
                                                        BOT
                                                    </span>
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
                                        ) : (
                                            <div>
                                                {standaloneGifUrl && (
                                                    <div className="mt-1">
                                                        <Image
                                                            src={
                                                                standaloneGifUrl
                                                            }
                                                            alt="GIF"
                                                            width={320}
                                                            height={224}
                                                            unoptimized
                                                            className="rounded-md max-w-xs max-h-56 object-contain border wd-border-subtle"
                                                        />
                                                    </div>
                                                )}

                                                {message.content &&
                                                    !standaloneGifUrl && (
                                                        <div>
                                                            <div className="text-sm wd-text-secondary whitespace-pre-wrap break-words">
                                                                {parsedMessageLinks.length >
                                                                0 ? (
                                                                    parsedMessageParts.map(
                                                                        (
                                                                            part,
                                                                            index,
                                                                        ) => {
                                                                            if (
                                                                                part.type !== "text" &&
                                                                                part.url
                                                                            ) {
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
                                                                            if (
                                                                                part.type !== "text"
                                                                            )
                                                                                return null;
                                                                            return (
                                                                                <MentionHighlightedContent
                                                                                    key={`${message.id}-text-${index}`}
                                                                                    content={
                                                                                        part.content
                                                                                    }
                                                                                    mentionedUserIds={
                                                                                        effectiveMentionedUserIds
                                                                                    }
                                                                                    memberNameMap={
                                                                                        memberNameMap
                                                                                    }
                                                                                    onClickMention={
                                                                                        handleMentionClick
                                                                                    }
                                                                                />
                                                                            );
                                                                        },
                                                                    )
                                                                ) : (
                                                                    <MentionHighlightedContent
                                                                        content={
                                                                            message.content
                                                                        }
                                                                        mentionedUserIds={
                                                                            effectiveMentionedUserIds
                                                                        }
                                                                        memberNameMap={
                                                                            memberNameMap
                                                                        }
                                                                        onClickMention={
                                                                            handleMentionClick
                                                                        }
                                                                    />
                                                                )}
                                                                {message.editedAt && (
                                                                    <span className="ml-1 text-[10px] wd-text-muted" title={`Edited ${formatChatMessageTimestamp(message.editedAt)}`}>(edited)</span>
                                                                )}
                                                            </div>

                                                            {(parsedMessageLinks.length >
                                                                0 ||
                                                                fallbackGenericUrls.length >
                                                                    0) && (
                                                                <div className="mt-2">
                                                                    {parsedMessageParts
                                                                        .filter(
                                                                            (part) =>
                                                                                part.type !== "text" &&
                                                                                !!part.url,
                                                                        )
                                                                        .map(
                                                                            (part, i) => (
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
                                                                            ),
                                                                        )}

                                                                    {fallbackGenericUrls.map(
                                                                        (url, index) => (
                                                                            <UnifiedLinkPreview
                                                                                key={`${message.id}-fallback-preview-${index}`}
                                                                                url={url}
                                                                                platform="generic"
                                                                                metadata={linkPreviews[url]}
                                                                            />
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                {message.attachments.length >
                                                    0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {message.attachments.map(
                                                            (attachment) => {
                                                                const urlState =
                                                                    attachmentUrls[
                                                                        attachment
                                                                            .id
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
                                                                            key={
                                                                                attachment.id
                                                                            }
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
                                                                    const imgSrc =
                                                                        showFull
                                                                            ? urlState.viewUrl!
                                                                            : (urlState.thumbnailUrl ??
                                                                              urlState.viewUrl ??
                                                                              "");
                                                                    const isThumbnail =
                                                                        !showFull &&
                                                                        !!urlState.thumbnailUrl;

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                attachment.id
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleImageClick(
                                                                                    attachment.id,
                                                                                )
                                                                            }
                                                                            className="relative block cursor-pointer group"
                                                                        >
                                                                            <Image
                                                                                src={
                                                                                    imgSrc
                                                                                }
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
                                                                                    Click
                                                                                    for
                                                                                    full
                                                                                    size
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
                                                                            key={
                                                                                attachment.id
                                                                            }
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
                                                                                    handleDownloadAttachment(
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
                                                                                    size={
                                                                                        12
                                                                                    }
                                                                                />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <button
                                                                        key={
                                                                            attachment.id
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleDownloadAttachment(
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
                                                                            size={
                                                                                12
                                                                            }
                                                                        />
                                                                    </button>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                )}

                                                <MessageReactionChips
                                                    roomId={message.roomId}
                                                    messageId={message.id}
                                                    reactions={
                                                        message.reactions || []
                                                    }
                                                    onToggleReaction={(
                                                        emoji,
                                                    ) => {
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
                                                            onOpenThread?.(
                                                                message.id,
                                                            )
                                                        }
                                                        className="mt-2 ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold wd-text-accent hover:bg-[var(--wd-accent-soft)]"
                                                    >
                                                        <span className="inline-flex items-center">
                                                            {messageReplyPreviewUsers
                                                                .slice(0, 3)
                                                                .map(
                                                                    (
                                                                        previewUser,
                                                                        index,
                                                                    ) => {
                                                                        const previewDisplayName =
                                                                            getDisplayName(
                                                                                previewUser,
                                                                                `User ${previewUser.id}`,
                                                                            );
                                                                        return (
                                                                            <span
                                                                                key={`${message.id}-reply-preview-${previewUser.id}`}
                                                                                className={`${
                                                                                    index ===
                                                                                    0
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
                                                                                        .charAt(
                                                                                            0,
                                                                                        )
                                                                                        .toUpperCase()
                                                                                )}
                                                                            </span>
                                                                        );
                                                                    },
                                                                )}
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
                            </React.Fragment>
                        );
                    })}
                    {profilePopover && (
                        <ProfilePopover
                            popover={profilePopover}
                            onClose={() => setProfilePopover(null)}
                            onAvatarUpdated={(newAvatar) => {
                                setProfilePopover({
                                    ...profilePopover,
                                    senderAvatar: newAvatar,
                                });
                            }}
                        />
                    )}
                    {avatarContextMenu && (
                        <div
                            data-avatar-context-menu="true"
                            className="fixed z-[250] min-w-[210px] rounded-md border wd-border-strong wd-bg-panel shadow-[0_14px_36px_rgba(0,0,0,0.45)] p-1"
                            style={{
                                left: avatarContextMenu.x,
                                top: avatarContextMenu.y,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    void handleAddFriend(
                                        avatarContextMenu.senderUserId,
                                        avatarContextMenu.senderName,
                                        true,
                                    );
                                }}
                                disabled={
                                    isAddingFriend ||
                                    avatarFriendActionMeta.isDisabled
                                }
                                title={avatarFriendActionMeta.tooltip}
                                className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-70 inline-flex items-center gap-2"
                            >
                                {avatarFriendActionMeta.isAccepted ? (
                                    <UserCheck
                                        size={14}
                                        className="text-emerald-400"
                                    />
                                ) : (
                                    <UserRoundPlus
                                        size={14}
                                        className="wd-text-secondary"
                                    />
                                )}
                                <span>
                                    {isAddingFriend
                                        ? "Sending..."
                                        : avatarFriendActionMeta.label}
                                </span>
                            </button>
                        </div>
                    )}
                </>
            )}
            <div ref={endRef} />
            {showNewMessagesPill ? (
                <button
                    type="button"
                    onClick={scrollToBottom}
                    className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 rounded-full px-4 py-1.5 text-xs font-medium shadow-lg wd-bg-accent wd-text-on-accent transition-opacity hover:opacity-90"
                >
                    New messages
                </button>
            ) : isScrolledFarBack ? (
                <button
                    type="button"
                    onClick={scrollToBottom}
                    className="sticky bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full border wd-border-subtle wd-bg-elevated px-3 py-1.5 text-xs font-medium wd-text-secondary shadow-lg transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                >
                    <ArrowDown size={13} />
                    Scroll to latest
                </button>
            ) : null}
            </div>
        </div>
    );
}

export default MessageList;
