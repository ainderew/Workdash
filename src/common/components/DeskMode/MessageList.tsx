import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
    ChatV2FriendshipStatus,
    ChatV2Message,
    ChatV2UserProfile,
} from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { getStandaloneGifUrl } from "@/communication/chatV2/gifUrl";
import { getSignedAttachmentUrl } from "@/communication/chatV2/uploadService";
import { extractDomain, parseMessageContent } from "@/common/utils/linkParser";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { GitHubPreview } from "@/common/components/TextChat/GitHubPreview";
import { TwitterPreview } from "@/common/components/TextChat/TwitterPreview";
import { YouTubePreview } from "@/common/components/TextChat/YouTubePreview";
import {
    buildMemberNameMap,
    extractMentionedUserIds,
} from "@/communication/chatV2/mentionUtils";
import MessageHoverActions from "./MessageHoverActions";
import MessageReactionChips from "./MessageReactionChips";
import MentionHighlightedContent from "./MentionHighlightedContent";
import {
    Ban,
    Copy,
    Ellipsis,
    ExternalLink,
    Flag,
    MessageSquare,
    Pencil,
    Save,
    UserCheck,
    UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";

interface MessageListProps {
    messages: ChatV2Message[];
    isLoading: boolean;
    focusedMessageId?: string | null;
    onOpenThread?: (rootMessageId: string) => void;
}

type LinkPreviewMetadata = {
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
};

type AvatarContextMenuState = {
    x: number;
    y: number;
    senderUserId: number;
    senderName: string;
};

type SenderAvatar =
    | {
          mode: "sprite";
          style: React.CSSProperties;
      }
    | {
          mode: "image";
          src: string;
      }
    | {
          mode: "fallback";
      };

type ProfilePopoverState = {
    x: number;
    y: number;
    senderUserId: number;
    senderName: string;
    senderAvatar: SenderAvatar;
};
const MAX_PREVIEW_RETRIES = 3;
const MAX_BIO_LENGTH = 280;

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

const formatTime = (value: string | Date) =>
    new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

const isFacebookVideoUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        const normalizedHost = parsed.hostname
            .toLowerCase()
            .replace(/^www\./, "");
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

const getSenderAvatarForMessage = (
    message: ChatV2Message,
    input: {
        localBackendUserId?: number;
        localSpriteSheet: string;
        localProfileImage: string;
        resolvedSenderImagesByUserId?: Record<number, string>;
    },
): SenderAvatar => {
    const isLocalSender =
        input.localBackendUserId !== undefined &&
        message.senderUserId === input.localBackendUserId;

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

    const senderImage =
        message.sender?.image?.trim() ||
        input.resolvedSenderImagesByUserId?.[message.senderUserId]?.trim();
    if (senderImage) {
        return { mode: "image", src: senderImage };
    }

    if (isLocalSender && input.localProfileImage) {
        return { mode: "image", src: input.localProfileImage };
    }

    return { mode: "fallback" };
};

function MessageList({
    messages,
    isLoading,
    focusedMessageId = null,
    onOpenThread,
}: MessageListProps) {
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const user = useUserStore((state) => state.user);
    const friends = useChatV2Store((state) => state.friends);
    const friendRequests = useChatV2Store((state) => state.friendRequests);
    const requestFriend = useChatV2Store((state) => state.requestFriend);
    const openDirectMessage = useChatV2Store(
        (state) => state.openDirectMessage,
    );
    const frequentEmojis = useChatV2Store((state) => state.frequentEmojis);
    const currentRoomId = useChatV2Store((state) => state.currentRoomId);
    const membersByRoomId = useChatV2Store((state) => state.membersByRoomId);
    const toggleMessageReaction = useChatV2Store(
        (state) => state.toggleMessageReaction,
    );
    const [attachmentUrls, setAttachmentUrls] = useState<
        Record<string, string>
    >({});
    const [linkPreviews, setLinkPreviews] = useState<
        Record<string, LinkPreviewMetadata | null>
    >({});
    const [previewRetryCounts, setPreviewRetryCounts] = useState<
        Record<string, number>
    >({});
    const [highlightedMessageId, setHighlightedMessageId] = useState<
        string | null
    >(null);
    const [avatarContextMenu, setAvatarContextMenu] =
        useState<AvatarContextMenuState | null>(null);
    const [profilePopover, setProfilePopover] =
        useState<ProfilePopoverState | null>(null);
    const [activeUserProfile, setActiveUserProfile] =
        useState<ChatV2UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [isSavingBio, setIsSavingBio] = useState(false);
    const [bioDraft, setBioDraft] = useState("");
    const [isBioEditing, setIsBioEditing] = useState(false);
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
    const [isOpeningDm, setIsOpeningDm] = useState(false);
    const [isAddingFriend, setIsAddingFriend] = useState(false);
    const [resolvedSenderImagesByUserId, setResolvedSenderImagesByUserId] =
        useState<Record<number, string>>({});
    const [
        avatarImageLookupStatusByUserId,
        setAvatarImageLookupStatusByUserId,
    ] = useState<Record<number, "pending" | "done">>({});
    const localBackendUserId =
        typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;
    const localDisplayName =
        user.name?.trim() || window.__BACKEND_USER__?.name || "";
    const localSpriteSheet = user.spriteSheetDataUrl?.trim() || "";
    const localProfileImage =
        user.image?.trim() || window.__BACKEND_USER__?.image || "";
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
    const profileFriendActionMeta = useMemo(
        () => getFriendActionMeta(activeUserProfile?.friendshipStatus ?? null),
        [activeUserProfile?.friendshipStatus],
    );
    const avatarContextFriendshipStatus =
        useMemo<ChatV2FriendshipStatus | null>(() => {
            if (!avatarContextMenu) return null;

            const targetUserId = avatarContextMenu.senderUserId;
            if (
                activeUserProfile &&
                activeUserProfile.user.id === targetUserId &&
                !activeUserProfile.isSelf
            ) {
                return activeUserProfile.friendshipStatus;
            }
            if (acceptedFriendUserIds.has(targetUserId)) return "ACCEPTED";
            if (pendingFriendUserIds.has(targetUserId)) return "PENDING";
            return null;
        }, [
            acceptedFriendUserIds,
            activeUserProfile,
            avatarContextMenu,
            pendingFriendUserIds,
        ]);
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
    const messageScrollSignature = useMemo(() => {
        if (messages.length === 0) return "empty";
        const firstMessageId = messages[0]?.id || "";
        const lastMessageId = messages[messages.length - 1]?.id || "";
        return `${messages.length}:${firstMessageId}:${lastMessageId}`;
    }, [messages]);

    useEffect(() => {
        if (focusedMessageId || isLoading) {
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
    }, [focusedMessageId, isLoading, messageScrollSignature]);

    useEffect(() => {
        if (!avatarContextMenu && !profilePopover) {
            return undefined;
        }

        const closeMenu = () => {
            setAvatarContextMenu(null);
            setProfilePopover(null);
            setActiveUserProfile(null);
            setProfileError(null);
            setIsBioEditing(false);
            setIsMoreOptionsOpen(false);
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
        if (!profilePopover) {
            setActiveUserProfile(null);
            setProfileError(null);
            setIsLoadingProfile(false);
            setIsBioEditing(false);
            setBioDraft("");
            return;
        }

        let cancelled = false;
        setIsLoadingProfile(true);
        setProfileError(null);
        setIsBioEditing(false);

        void (async () => {
            try {
                const profile = await chatV2Service.getUserProfile(
                    profilePopover.senderUserId,
                );
                if (cancelled) return;

                setActiveUserProfile(profile);
                setBioDraft(profile.user.bio || "");
                setIsLoadingProfile(false);
            } catch (error) {
                if (cancelled) return;
                setIsLoadingProfile(false);
                setActiveUserProfile(null);
                setProfileError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load user profile",
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [chatV2Service, profilePopover]);

    useEffect(() => {
        const unresolvedAttachments: Array<{
            roomId: string;
            objectKey: string;
        }> = [];

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
                    (message.content.match(/https?:\/\/[^\s]+/gi) || []).map(
                        (url) => url.trim(),
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
                        const payload =
                            (await response.json()) as LinkPreviewMetadata;
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
        return message.sender?.name?.trim() || `User ${message.senderUserId}`;
    };

    const getSenderAvatar = (message: ChatV2Message) => {
        return getSenderAvatarForMessage(message, {
            localBackendUserId,
            localSpriteSheet,
            localProfileImage,
            resolvedSenderImagesByUserId,
        });
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
        setActiveUserProfile(null);
        setProfileError(null);
        setIsBioEditing(false);
        setIsMoreOptionsOpen(false);
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
            senderName: displayName,
            senderAvatar,
        });
        setAvatarContextMenu(null);
        setIsMoreOptionsOpen(false);
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
        setIsMoreOptionsOpen(false);
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
                setIsMoreOptionsOpen(false);
            }
        }
    };

    const handleOpenDirectMessage = async (
        userId: number,
        senderName: string,
        closeMenus = false,
    ) => {
        if (isOpeningDm) {
            return;
        }

        setIsOpeningDm(true);
        try {
            await openDirectMessage(userId);
            toast("Private message opened", {
                description: `You can now DM ${senderName}.`,
            });
            if (closeMenus) {
                setProfilePopover(null);
                setIsMoreOptionsOpen(false);
            }
        } catch (error) {
            toast("Unable to open private message", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
            });
        } finally {
            setIsOpeningDm(false);
        }
    };

    const handleSaveBio = async () => {
        if (!activeUserProfile?.isSelf || isSavingBio) {
            return;
        }

        setIsSavingBio(true);
        try {
            const profile = await chatV2Service.updateOwnUserProfile({
                bio: bioDraft,
            });
            setActiveUserProfile(profile);
            setBioDraft(profile.user.bio || "");
            setIsBioEditing(false);
            toast("Profile updated", {
                description: "Your bio was saved.",
            });
        } catch (error) {
            toast("Failed to update bio", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
            });
        } finally {
            setIsSavingBio(false);
        }
    };

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
        const hasRichMetadata = !!(
            metadata?.title ||
            metadata?.description ||
            metadata?.image
        );

        if (hasRichMetadata && !isFacebookVideo) {
            const displayDomain =
                metadata?.domain || extractDomain(metadata?.url || url);
            const displayTitle =
                metadata?.title || metadata?.siteName || displayDomain;
            const displayDescription =
                metadata?.description ||
                metadata?.siteName ||
                metadata?.url ||
                url;
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
                        <p className="text-xs wd-text-muted truncate">
                            {displayDomain}
                        </p>
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
            const displayDescription =
                metadata?.description || "Open on Facebook";

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
                        <p className="text-xs wd-text-muted truncate">
                            {displayDomain}
                        </p>
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
                    <ExternalLink
                        size={14}
                        className="shrink-0 wd-text-secondary"
                    />
                </div>
            </a>
        );
    };

    return (
        <div
            ref={scrollContainerRef}
            className="no-scrollbar flex-1 overflow-y-auto px-5 py-4 space-y-3 wd-bg-panel-2"
        >
            {isLoading ? (
                <div className="text-xs wd-text-muted">Loading messages...</div>
            ) : groupedMessages.rootMessages.length === 0 ? (
                <div className="text-xs wd-text-muted">
                    No messages yet. Start the room conversation.
                </div>
            ) : (
                groupedMessages.rootMessages.map((message) => {
                    const threadReplies =
                        groupedMessages.repliesByRootId.get(message.id) || [];
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
                                      if (previewUsers.has(reply.senderUserId))
                                          continue;
                                      previewUsers.set(reply.senderUserId, {
                                          id: reply.senderUserId,
                                          name:
                                              reply.sender?.name ||
                                              `User ${reply.senderUserId}`,
                                          image: reply.sender?.image || null,
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
                    const parsedMessageLinks = parsedMessageParts.filter(
                        (part) => part.type !== "text" && !!part.url,
                    );
                    const parsedMessageLinkUrls = new Set(
                        parsedMessageLinks.map((part) => part.url as string),
                    );
                    const extractedUrls = Array.from(
                        new Set(
                            (
                                message.content?.match(/https?:\/\/[^\s]+/gi) ||
                                []
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
                        effectiveMentionedUserIds.includes(localBackendUserId);
                    const hasMentions = effectiveMentionedUserIds.length > 0;

                    return (
                        <div
                            key={message.id}
                            data-chat-message-id={message.id}
                            className={`group flex gap-3 px-1 py-1 transition-colors ${
                                highlightedMessageId === message.id ||
                                isThreadHighlighted
                                    ? "rounded-md bg-[var(--wd-accent-soft)]"
                                    : isCurrentUserMentioned
                                      ? "border-l-2 border-l-[rgb(240,185,11)] bg-[rgba(240,185,11,0.06)]"
                                      : ""
                            }`}
                        >
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
                                className="w-9 h-9 rounded-full wd-bg-elevated wd-text-secondary text-xs flex items-center justify-center font-semibold overflow-hidden border wd-border-subtle cursor-pointer"
                            >
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
                                    <span>
                                        {senderName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <div className="min-w-0 flex-1 relative">
                                <MessageHoverActions
                                    canReply={!message.replyToMessageId}
                                    frequentEmojis={frequentEmojis.map(
                                        (entry) => entry.emoji,
                                    )}
                                    onReply={() => {
                                        if (!message.replyToMessageId) {
                                            onOpenThread?.(message.id);
                                            return;
                                        }
                                        handleFutureMessageAction("Reply");
                                    }}
                                    onReact={(emoji) => {
                                        void toggleMessageReaction(
                                            message.id,
                                            emoji,
                                        );
                                    }}
                                    onFutureAction={handleFutureMessageAction}
                                />

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
                                                                        part.type !==
                                                                        "text"
                                                                    )
                                                                        return null;
                                                                    if (
                                                                        hasMentions &&
                                                                        part.content
                                                                    ) {
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
                                                                    }
                                                                    return (
                                                                        <span
                                                                            key={`${message.id}-text-${index}`}
                                                                        >
                                                                            {
                                                                                part.content
                                                                            }
                                                                        </span>
                                                                    );
                                                                },
                                                            )
                                                        ) : hasMentions ? (
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
                                                        ) : (
                                                            message.content
                                                        )}
                                                    </div>

                                                    {(parsedMessageLinks.length >
                                                        0 ||
                                                        fallbackGenericUrls.length >
                                                            0) && (
                                                        <div className="mt-2">
                                                            {parsedMessageParts.map(
                                                                (
                                                                    part,
                                                                    index,
                                                                ) => {
                                                                    const key = `${message.id}-preview-${index}`;

                                                                    if (
                                                                        part.type ===
                                                                            "youtube" &&
                                                                        part.youtubeId &&
                                                                        part.url
                                                                    ) {
                                                                        return (
                                                                            <YouTubePreview
                                                                                key={
                                                                                    key
                                                                                }
                                                                                videoId={
                                                                                    part.youtubeId
                                                                                }
                                                                                url={
                                                                                    part.url
                                                                                }
                                                                            />
                                                                        );
                                                                    }

                                                                    if (
                                                                        part.type ===
                                                                            "twitter" &&
                                                                        part.twitterUsername &&
                                                                        part.twitterId &&
                                                                        part.url
                                                                    ) {
                                                                        return (
                                                                            <TwitterPreview
                                                                                key={
                                                                                    key
                                                                                }
                                                                                username={
                                                                                    part.twitterUsername
                                                                                }
                                                                                twitterId={
                                                                                    part.twitterId
                                                                                }
                                                                                url={
                                                                                    part.url
                                                                                }
                                                                            />
                                                                        );
                                                                    }

                                                                    if (
                                                                        part.type ===
                                                                            "github" &&
                                                                        part.githubOwner &&
                                                                        part.githubRepo &&
                                                                        part.githubType &&
                                                                        part.url
                                                                    ) {
                                                                        return (
                                                                            <GitHubPreview
                                                                                key={
                                                                                    key
                                                                                }
                                                                                owner={
                                                                                    part.githubOwner
                                                                                }
                                                                                repo={
                                                                                    part.githubRepo
                                                                                }
                                                                                type={
                                                                                    part.githubType
                                                                                }
                                                                                issueNumber={
                                                                                    part.githubIssueNumber
                                                                                }
                                                                                url={
                                                                                    part.url
                                                                                }
                                                                            />
                                                                        );
                                                                    }

                                                                    if (
                                                                        part.type ===
                                                                            "link" &&
                                                                        part.url
                                                                    ) {
                                                                        return renderGenericLinkPreview(
                                                                            part.url,
                                                                            key,
                                                                            linkPreviews[
                                                                                part
                                                                                    .url
                                                                            ],
                                                                        );
                                                                    }

                                                                    return null;
                                                                },
                                                            )}

                                                            {fallbackGenericUrls.map(
                                                                (url, index) =>
                                                                    renderGenericLinkPreview(
                                                                        url,
                                                                        `${message.id}-fallback-preview-${index}`,
                                                                        linkPreviews[
                                                                            url
                                                                        ],
                                                                    ),
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                        {message.attachments.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {message.attachments.map(
                                                    (attachment) => (
                                                        <div
                                                            key={attachment.id}
                                                        >
                                                            {attachment.isImage &&
                                                            attachmentUrls[
                                                                attachment
                                                                    .objectKey
                                                            ] ? (
                                                                <img
                                                                    src={
                                                                        attachmentUrls[
                                                                            attachment
                                                                                .objectKey
                                                                        ]
                                                                    }
                                                                    alt={
                                                                        attachment.originalFileName
                                                                    }
                                                                    className="rounded-md max-w-xs max-h-56 object-cover border wd-border-subtle"
                                                                />
                                                            ) : attachmentUrls[
                                                                  attachment
                                                                      .objectKey
                                                              ] ? (
                                                                <a
                                                                    href={
                                                                        attachmentUrls[
                                                                            attachment
                                                                                .objectKey
                                                                        ]
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs px-2 py-1 rounded wd-bg-elevated wd-text-accent truncate inline-block border wd-border-subtle"
                                                                >
                                                                    {
                                                                        attachment.originalFileName
                                                                    }
                                                                </a>
                                                            ) : (
                                                                <div className="text-xs px-2 py-1 rounded wd-bg-elevated wd-text-secondary truncate border wd-border-subtle">
                                                                    Resolving{" "}
                                                                    {
                                                                        attachment.originalFileName
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    ),
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
                                                        .map(
                                                            (
                                                                previewUser,
                                                                index,
                                                            ) => (
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
                                                                        <img
                                                                            src={
                                                                                previewUser.image
                                                                            }
                                                                            alt={
                                                                                previewUser.name ||
                                                                                `User ${previewUser.id}`
                                                                            }
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        (
                                                                            previewUser.name ||
                                                                            "U"
                                                                        )
                                                                            .charAt(
                                                                                0,
                                                                            )
                                                                            .toUpperCase()
                                                                    )}
                                                                </span>
                                                            ),
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
                    );
                })
            )}
            {profilePopover && (
                <div
                    data-user-profile-popover="true"
                    className="fixed z-[170] w-[360px] rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)] overflow-hidden"
                    style={{
                        left: profilePopover.x,
                        top: profilePopover.y,
                    }}
                >
                    <div className="relative h-24 bg-[linear-gradient(120deg,rgba(88,101,242,0.18),rgba(15,17,21,0.98))]">
                        <div className="absolute right-3 top-3 flex items-center gap-2">
                            {activeUserProfile && !activeUserProfile.isSelf && (
                                <button
                                    type="button"
                                    disabled={
                                        isAddingFriend ||
                                        profileFriendActionMeta.isDisabled
                                    }
                                    onClick={() => {
                                        void handleAddFriend(
                                            profilePopover.senderUserId,
                                            profilePopover.senderName,
                                        );
                                    }}
                                    title={profileFriendActionMeta.tooltip}
                                    className={`h-9 w-9 rounded-full border inline-flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                        profileFriendActionMeta.isAccepted
                                            ? "border-emerald-700 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60"
                                            : "wd-border-subtle wd-bg-panel-2 wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                    }`}
                                >
                                    {profileFriendActionMeta.isAccepted ? (
                                        <UserCheck size={15} />
                                    ) : (
                                        <UserRoundPlus size={15} />
                                    )}
                                </button>
                            )}

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsMoreOptionsOpen(
                                            (current) => !current,
                                        )
                                    }
                                    title="More options"
                                    className="h-9 w-9 rounded-full border wd-border-subtle wd-bg-panel-2 wd-text-primary inline-flex items-center justify-center transition-colors hover:bg-[var(--wd-surface-elevated)]"
                                >
                                    <Ellipsis size={16} />
                                </button>

                                {isMoreOptionsOpen && (
                                    <div
                                        data-user-profile-more="true"
                                        className="absolute right-0 top-[calc(100%+8px)] z-[175] w-56 rounded-xl border wd-border-strong wd-bg-panel shadow-[0_18px_42px_rgba(0,0,0,0.45)] p-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(
                                                        String(
                                                            profilePopover.senderUserId,
                                                        ),
                                                    );
                                                    toast("User ID copied", {
                                                        description: `Copied ${profilePopover.senderUserId}.`,
                                                    });
                                                } catch {
                                                    toast(
                                                        "Unable to copy user ID",
                                                        {
                                                            description:
                                                                "Please try again.",
                                                        },
                                                    );
                                                }
                                                setIsMoreOptionsOpen(false);
                                            }}
                                            className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
                                        >
                                            <Copy
                                                size={14}
                                                className="wd-text-secondary"
                                            />
                                            Copy User ID
                                        </button>
                                        {activeUserProfile &&
                                            !activeUserProfile.isSelf && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void handleOpenDirectMessage(
                                                            profilePopover.senderUserId,
                                                            profilePopover.senderName,
                                                            true,
                                                        );
                                                    }}
                                                    className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
                                                >
                                                    <MessageSquare
                                                        size={14}
                                                        className="wd-text-secondary"
                                                    />
                                                    Send Private Message
                                                </button>
                                            )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toast("Thanks for the report", {
                                                    description:
                                                        "Moderation review workflow is coming soon.",
                                                });
                                                setIsMoreOptionsOpen(false);
                                            }}
                                            className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-danger transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
                                        >
                                            <Flag size={14} />
                                            Report User Profile
                                        </button>
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-muted inline-flex items-center gap-2 opacity-70"
                                        >
                                            <Ban size={14} />
                                            Block (Soon)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 pb-4 -mt-8">
                        <div className="h-16 w-16 rounded-full border-4 wd-border-strong wd-bg-elevated overflow-hidden">
                            {profilePopover.senderAvatar.mode === "sprite" ? (
                                <div
                                    className="h-full w-full bg-no-repeat"
                                    style={profilePopover.senderAvatar.style}
                                />
                            ) : profilePopover.senderAvatar.mode === "image" ? (
                                <img
                                    src={profilePopover.senderAvatar.src}
                                    alt={`${profilePopover.senderName} avatar`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full inline-flex items-center justify-center text-xl font-semibold wd-text-primary">
                                    {profilePopover.senderName
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="mt-3">
                            <p className="text-xl font-semibold wd-text-primary truncate">
                                {profilePopover.senderName}
                            </p>
                            <p className="text-xs wd-text-muted">
                                User ID: {profilePopover.senderUserId}
                            </p>
                        </div>

                        {isLoadingProfile ? (
                            <p className="mt-4 text-sm wd-text-muted">
                                Loading profile...
                            </p>
                        ) : profileError ? (
                            <p className="mt-4 text-sm wd-text-danger">
                                {profileError}
                            </p>
                        ) : activeUserProfile ? (
                            <div className="mt-4 space-y-3">
                                <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wide wd-text-muted">
                                            Bio
                                        </p>
                                        {activeUserProfile.isSelf &&
                                            !isBioEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setIsBioEditing(true)
                                                    }
                                                    className="text-xs wd-text-secondary inline-flex items-center gap-1 hover:wd-text-primary"
                                                >
                                                    <Pencil size={12} />
                                                    Edit
                                                </button>
                                            )}
                                    </div>

                                    {activeUserProfile.isSelf &&
                                    isBioEditing ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={bioDraft}
                                                onChange={(event) =>
                                                    setBioDraft(
                                                        event.target.value.slice(
                                                            0,
                                                            MAX_BIO_LENGTH,
                                                        ),
                                                    )
                                                }
                                                rows={4}
                                                placeholder="Write a short bio..."
                                                className="w-full rounded-md border wd-border-subtle wd-bg-elevated p-2 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                                            />
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] wd-text-muted">
                                                    {bioDraft.length}/
                                                    {MAX_BIO_LENGTH}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsBioEditing(
                                                                false,
                                                            );
                                                            setBioDraft(
                                                                activeUserProfile
                                                                    .user.bio ||
                                                                    "",
                                                            );
                                                        }}
                                                        className="h-7 px-2 rounded-md border wd-border-subtle wd-bg-elevated text-xs wd-text-secondary transition-colors hover:wd-text-primary"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void handleSaveBio();
                                                        }}
                                                        disabled={isSavingBio}
                                                        className="h-7 px-2 rounded-md bg-[var(--wd-accent)] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors hover:bg-[var(--wd-accent-hover)] disabled:opacity-70"
                                                    >
                                                        <Save size={12} />
                                                        {isSavingBio
                                                            ? "Saving..."
                                                            : "Save"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm wd-text-secondary whitespace-pre-wrap break-words">
                                            {activeUserProfile.user.bio?.trim() ||
                                                (activeUserProfile.isSelf
                                                    ? "Set your bio to help others know you."
                                                    : "No bio set yet.")}
                                        </p>
                                    )}
                                </div>

                                {!activeUserProfile.isSelf && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleOpenDirectMessage(
                                                profilePopover.senderUserId,
                                                profilePopover.senderName,
                                                true,
                                            );
                                        }}
                                        disabled={isOpeningDm}
                                        className="w-full h-9 rounded-md bg-[var(--wd-accent)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors hover:bg-[var(--wd-accent-hover)] disabled:opacity-70"
                                    >
                                        <MessageSquare size={14} />
                                        {isOpeningDm
                                            ? "Opening..."
                                            : `Send Private Message`}
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
            {avatarContextMenu && (
                <div
                    data-avatar-context-menu="true"
                    className="fixed z-[160] min-w-[210px] rounded-md border wd-border-strong wd-bg-panel shadow-[0_14px_36px_rgba(0,0,0,0.45)] p-1"
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
                            isAddingFriend || avatarFriendActionMeta.isDisabled
                        }
                        title={avatarFriendActionMeta.tooltip}
                        className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-70 inline-flex items-center gap-2"
                    >
                        {avatarFriendActionMeta.isAccepted ? (
                            <UserCheck size={14} className="text-emerald-400" />
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
            <div ref={endRef} />
        </div>
    );
}

export default MessageList;
