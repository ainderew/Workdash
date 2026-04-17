import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import type {
    AwardTagData,
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
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { useLinkPreviews } from "@/common/hooks/useLinkPreviews";
import {
    buildMemberNameMap,
    getMemberDisplayName,
} from "@/communication/chatV2/mentionUtils";
import MessageSkeleton from "./MessageSkeleton";
import { ArrowDown, UserCheck, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { getDisplayName } from "@/common/utils/displayName";
import { ProfilePopover } from "./profile-popover";
import type { ProfilePopoverState, SenderAvatar } from "./profile-popover";
import {
    generateCharacterFaceDataUrl,
    toCharacterCustomization,
} from "@/common/utils/characterFaceAvatar";
import { getMusicBotAvatarSync } from "@/common/utils/botAvatar";
import ImagePreviewLightbox from "./ImagePreviewLightbox";
import type { LightboxImage } from "./ImagePreviewLightbox";
import useMessageEdit from "@/common/hooks/useMessageEdit";
import { useUsersInCall } from "@/common/hooks/useUsersInCall";
import MessageRow from "./MessageRow";

interface MessageListProps {
    messages: ChatV2Message[];
    isLoading: boolean;
    focusedMessageId?: string | null;
    onFocusedMessageHandled?: () => void;
    onOpenThread?: (rootMessageId: string) => void;
    isLoadingOlderMessages?: boolean;
    hasMoreMessages?: boolean;
    onLoadOlderMessages?: () => void;
    memberRoleColors?: Map<number, string>;
    awardTagMap?: Map<number, AwardTagData>;
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

const LOAD_COOLDOWN_MS = 500;
const MAX_FOCUSED_MSG_RETRIES = 10;
const FIRST_ITEM_INDEX = 100_000;

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
    onFocusedMessageHandled,
    onOpenThread,
    isLoadingOlderMessages = false,
    hasMoreMessages = true,
    onLoadOlderMessages,
    memberRoleColors,
    awardTagMap,
    pinnedMessageIds,
    onPinMessage,
    onUnpinMessage,
}: MessageListProps) {
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const usersInCall = useUsersInCall();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const isLoadingOlderRef = useRef(false);
    const lastLoadTimestampRef = useRef(0);
    const focusedMessageRetriesRef = useRef(0);
    const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const isAtBottomRef = useRef(true);
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
    const [lightboxState, setLightboxState] = useState<LightboxImage | null>(
        null,
    );
    const [resolvedSenderImagesByUserId, setResolvedSenderImagesByUserId] =
        useState<Record<number, string>>({});
    const [
        avatarImageLookupStatusByUserId,
        setAvatarImageLookupStatusByUserId,
    ] = useState<Record<number, "pending" | "done">>({});
    const localBackendUserId = backendUser?.id;
    const localDisplayName = getDisplayName(
        {
            nickname: user.nickname ?? backendUser?.nickname ?? null,
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

    const firstItemIndex = useMemo(
        () => FIRST_ITEM_INDEX - groupedMessages.rootMessages.length,
        [groupedMessages.rootMessages.length],
    );

    // Sync loading ref for startReached guard
    useEffect(() => {
        isLoadingOlderRef.current = isLoadingOlderMessages;
    }, [isLoadingOlderMessages]);

    // Reset state on room switch
    useEffect(() => {
        setShowNewMessagesPill(false);
        setIsAtBottom(true);
        isAtBottomRef.current = true;
    }, [currentRoomId]);

    // Handle new messages: snap to bottom for own sends, show pill for others
    useEffect(() => {
        if (focusedMessageId || isLoading) return;
        if (isLoadingOlderRef.current) return;
        if (isAtBottomRef.current) return;

        const lastMessage =
            groupedMessages.rootMessages[
                groupedMessages.rootMessages.length - 1
            ];
        const isSentByLocalUser =
            typeof localBackendUserId === "number" &&
            lastMessage?.senderUserId === localBackendUserId;

        if (isSentByLocalUser) {
            virtuosoRef.current?.scrollToIndex({
                index: groupedMessages.rootMessages.length - 1,
                behavior: "auto",
            });
        } else {
            setShowNewMessagesPill(true);
        }
    }, [
        focusedMessageId,
        isLoading,
        lastMessageId,
        localBackendUserId,
        groupedMessages.rootMessages,
    ]);

    // Focused message scroll via Virtuoso
    useEffect(() => {
        if (!focusedMessageId) {
            focusedMessageRetriesRef.current = 0;
            return;
        }

        const index = groupedMessages.rootMessages.findIndex(
            (m) => m.id === focusedMessageId,
        );
        if (index === -1) {
            if (
                hasMoreMessages &&
                !isLoadingOlderMessages &&
                focusedMessageRetriesRef.current < MAX_FOCUSED_MSG_RETRIES
            ) {
                focusedMessageRetriesRef.current += 1;
                onLoadOlderMessages?.();
            }
            return;
        }

        virtuosoRef.current?.scrollToIndex({
            index,
            align: "center",
            behavior: "smooth",
        });
        setHighlightedMessageId(focusedMessageId);

        const timeout = window.setTimeout(() => {
            setHighlightedMessageId((current) =>
                current === focusedMessageId ? null : current,
            );
            onFocusedMessageHandled?.();
        }, 1800);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [
        focusedMessageId,
        groupedMessages.rootMessages,
        hasMoreMessages,
        isLoadingOlderMessages,
        onFocusedMessageHandled,
        onLoadOlderMessages,
    ]);

    useEffect(() => {
        if (!avatarContextMenu && !profilePopover) {
            return undefined;
        }

        const closeAll = () => {
            setAvatarContextMenu(null);
            setProfilePopover(null);
        };

        const closeContextMenuOnly = () => {
            setAvatarContextMenu(null);
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
            closeAll();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeAll();
            }
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", closeContextMenuOnly, true);
        window.addEventListener("resize", closeAll);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", closeContextMenuOnly, true);
            window.removeEventListener("resize", closeAll);
        };
    }, [avatarContextMenu, profilePopover]);

    useEffect(() => {
        const unresolvedAttachments: Array<{
            fileId: string;
            isImage: boolean;
        }> = [];

        for (const message of messages) {
            for (const attachment of message.attachments) {
                if (attachment.expiredAt) continue;
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

            void (async () => {
                const url = await generateCharacterFaceDataUrl(
                    toCharacterCustomization(cc),
                );
                if (url) {
                    setResolvedSenderImagesByUserId((prev) => ({
                        ...prev,
                        [message.senderUserId]: url,
                    }));
                }
            })();
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

    const getSenderName = useCallback(
        (message: ChatV2Message) => {
            const isLocalSender =
                localBackendUserId !== undefined &&
                message.senderUserId === localBackendUserId;
            if (isLocalSender && localDisplayName) {
                return localDisplayName;
            }
            return getDisplayName(
                message.sender,
                `User ${message.senderUserId}`,
            );
        },
        [localBackendUserId, localDisplayName],
    );

    const getSenderAvatar = useCallback(
        (message: ChatV2Message) => {
            return getSenderAvatarForMessage(message, {
                localBackendUserId,
                localSpriteSheet,
                localProfileImage,
                resolvedSenderImagesByUserId,
            });
        },
        [
            localBackendUserId,
            localSpriteSheet,
            localProfileImage,
            resolvedSenderImagesByUserId,
        ],
    );

    const handleImageClick = useCallback(
        (fileId: string, fileName: string) => {
            const current = attachmentUrls[fileId];
            if (current?.viewUrl) {
                setLightboxState({
                    fileId,
                    imageUrl: current.viewUrl,
                    fileName,
                });
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
                            showFull: false,
                        },
                    }));
                    setLightboxState({ fileId, imageUrl: viewUrl, fileName });
                } catch {
                    // Silently fail - user can try clicking again
                }
            })();
        },
        [attachmentUrls],
    );

    const handleGifClick = useCallback((gifUrl: string) => {
        setLightboxState({ fileId: "", imageUrl: gifUrl, fileName: "GIF" });
    }, []);

    const handleDownloadAttachment = useCallback(
        (fileId: string, filename: string) => {
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
        },
        [],
    );

    const openAvatarContextMenu = useCallback(
        (
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
        },
        [localBackendUserId],
    );

    const handleMentionClick = useCallback(
        (
            event: React.MouseEvent | React.KeyboardEvent,
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
            const isKeyboard =
                !("clientX" in event) ||
                (event.clientX === 0 && event.clientY === 0);
            const rect = (
                event.target as HTMLElement
            ).getBoundingClientRect();
            const desiredX = isKeyboard
                ? rect.left + rect.width / 2
                : event.clientX + 12;
            const desiredY = isKeyboard
                ? rect.bottom + 4
                : event.clientY - 16;
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
        },
        [memberNameMap, resolvedSenderImagesByUserId, roomMembers],
    );

    const openProfilePopover = useCallback(
        (
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
        },
        [],
    );

    const handleAddFriend = useCallback(
        async (userId: number, senderName: string, closeMenus = false) => {
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
        },
        [isAddingFriend, requestFriend],
    );

    const handleFutureMessageAction = useCallback((label: string) => {
        toast(`${label} is coming soon`, {
            description: "This action is a placeholder for now.",
        });
    }, []);

    const handleUnsendImage = useCallback(
        (message: ChatV2Message) => {
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
                    await chatV2Service.deleteMessage(
                        message.roomId,
                        message.id,
                    );
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
        },
        [chatV2Service, localBackendUserId],
    );

    const handleFlyoutChange = useCallback(
        (messageId: string | null) => setFlyoutMessageId(messageId),
        [],
    );

    const handleAtBottomChange = useCallback((atBottom: boolean) => {
        setIsAtBottom(atBottom);
        isAtBottomRef.current = atBottom;
        if (atBottom) {
            setShowNewMessagesPill(false);
        }
    }, []);

    const handleStartReached = useCallback(() => {
        const now = Date.now();
        if (
            !isLoadingOlderRef.current &&
            hasMoreMessages &&
            now - lastLoadTimestampRef.current >= LOAD_COOLDOWN_MS
        ) {
            lastLoadTimestampRef.current = now;
            onLoadOlderMessages?.();
        }
    }, [hasMoreMessages, onLoadOlderMessages]);

    const scrollToBottom = useCallback(() => {
        virtuosoRef.current?.scrollToIndex({
            index: groupedMessages.rootMessages.length - 1,
            behavior: "smooth",
        });
        setShowNewMessagesPill(false);
    }, [groupedMessages.rootMessages.length]);

    const handleFollowOutput = useCallback(
        (isBottom: boolean) => (isBottom ? "auto" : false),
        [],
    );

    const headerContent = useMemo(() => {
        if (isLoadingOlderMessages) {
            return (
                <div className="px-5 py-4">
                    <MessageSkeleton count={3} />
                </div>
            );
        }
        if (!hasMoreMessages) {
            return (
                <div className="pb-4 pt-2 text-center text-xs wd-text-muted">
                    This is the beginning of the conversation
                </div>
            );
        }
        return null;
    }, [hasMoreMessages, isLoadingOlderMessages]);

    const Header = useCallback(
        () => <>{headerContent}</>,
        [headerContent],
    );

    const itemContent = useCallback(
        (index: number, message: ChatV2Message) => {
            const arrayIndex = index - firstItemIndex;
            const previousMessage =
                arrayIndex > 0
                    ? groupedMessages.rootMessages[arrayIndex - 1]
                    : null;
            const threadReplies =
                groupedMessages.repliesByRootId.get(message.id) || [];

            return (
                <MessageRow
                    message={message}
                    previousMessage={previousMessage}
                    threadReplies={threadReplies}
                    flyoutMessageId={flyoutMessageId}
                    editingMessageId={editingMessageId}
                    highlightedMessageId={highlightedMessageId}
                    pinnedMessageIds={pinnedMessageIds}
                    localBackendUserId={localBackendUserId}
                    memberNameMap={memberNameMap}
                    memberRoleColors={memberRoleColors}
                    awardTagMap={awardTagMap}
                    usersInCall={usersInCall}
                    roomMembers={roomMembers}
                    attachmentUrls={attachmentUrls}
                    linkPreviews={linkPreviews}
                    getSenderName={getSenderName}
                    getSenderAvatar={getSenderAvatar}
                    onOpenThread={onOpenThread}
                    onPinMessage={onPinMessage}
                    onUnpinMessage={onUnpinMessage}
                    onFlyoutChange={handleFlyoutChange}
                    onProfilePopover={openProfilePopover}
                    onAvatarContextMenu={openAvatarContextMenu}
                    onMentionClick={handleMentionClick}
                    onImageClick={handleImageClick}
                    onGifClick={handleGifClick}
                    onDownloadAttachment={handleDownloadAttachment}
                    onUnsendImage={handleUnsendImage}
                    onFutureAction={handleFutureMessageAction}
                    startEdit={startEdit}
                    cancelEdit={cancelEdit}
                    saveEdit={saveEdit}
                    toggleMessageReaction={toggleMessageReaction}
                />
            );
        },
        [
            firstItemIndex,
            groupedMessages,
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
            handleFlyoutChange,
            openProfilePopover,
            openAvatarContextMenu,
            handleMentionClick,
            handleImageClick,
            handleGifClick,
            handleDownloadAttachment,
            handleUnsendImage,
            handleFutureMessageAction,
            startEdit,
            cancelEdit,
            saveEdit,
            toggleMessageReaction,
        ],
    );

    const computeItemKey = useCallback(
        (_index: number, message: ChatV2Message) => message.id,
        [],
    );

    return (
        <div className="relative flex-1 overflow-hidden wd-bg-panel-2">
            {isLoading ? (
                <div className="px-5 py-4">
                    <MessageSkeleton count={8} />
                </div>
            ) : groupedMessages.rootMessages.length === 0 ? (
                <div className="px-5 py-4 text-xs wd-text-muted">
                    No messages yet. Start the room conversation.
                </div>
            ) : (
                <Virtuoso
                    key={currentRoomId}
                    ref={virtuosoRef}
                    data={groupedMessages.rootMessages}
                    firstItemIndex={firstItemIndex}
                    initialTopMostItemIndex={
                        groupedMessages.rootMessages.length - 1
                    }
                    followOutput={handleFollowOutput}
                    startReached={handleStartReached}
                    atBottomStateChange={handleAtBottomChange}
                    atBottomThreshold={100}
                    increaseViewportBy={{ top: 400, bottom: 200 }}
                    computeItemKey={computeItemKey}
                    itemContent={itemContent}
                    components={{ Header }}
                    className="no-scrollbar"
                    style={{
                        height: "100%",
                        width: "100%",
                        paddingLeft: 16,
                        paddingRight: 16,
                        paddingBottom: 8,
                    }}
                />
            )}

            {showNewMessagesPill ? (
                <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 rounded-full px-4 py-1.5 text-xs font-medium shadow-lg wd-bg-accent wd-text-on-accent transition-opacity hover:opacity-90"
                >
                    New messages
                </button>
            ) : !isAtBottom ? (
                <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full border wd-border-subtle wd-bg-elevated px-3 py-1.5 text-xs font-medium wd-text-secondary shadow-lg transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                >
                    <ArrowDown size={13} />
                    Scroll to latest
                </button>
            ) : null}

            {profilePopover && (
                <ProfilePopover
                    popover={profilePopover}
                    onClose={() => setProfilePopover(null)}
                    awardTag={awardTagMap?.get(profilePopover.senderUserId)}
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
                                className="text-[var(--wd-success)]"
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

            {lightboxState && (
                <ImagePreviewLightbox
                    current={lightboxState}
                    gallery={messages
                        .flatMap((msg) => {
                            const gifUrl =
                                msg.messageType === "IMAGE" &&
                                msg.attachments.length === 0
                                    ? getStandaloneGifUrl(msg.content)
                                    : null;
                            if (gifUrl) {
                                return [
                                    {
                                        fileId: "",
                                        imageUrl: gifUrl,
                                        fileName: "GIF",
                                    },
                                ];
                            }
                            return msg.attachments
                                .filter((a) => a.isImage && !a.expiredAt)
                                .map((a) => ({
                                    fileId: a.id,
                                    imageUrl:
                                        attachmentUrls[a.id]?.viewUrl ??
                                        attachmentUrls[a.id]?.thumbnailUrl ??
                                        "",
                                    fileName: a.originalFileName,
                                }));
                        })
                        .filter((img) => img.imageUrl)}
                    onClose={() => setLightboxState(null)}
                />
            )}
        </div>
    );
}

export default MessageList;
