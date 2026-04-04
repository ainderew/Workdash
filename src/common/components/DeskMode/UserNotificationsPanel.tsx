import React, { useMemo, useState } from "react";
import {
    AtSign,
    Ban,
    Check,
    CheckCheck,
    ChevronDown,
    Inbox,
    MessageSquareReply,
    RefreshCw,
    UserPlus,
    X,
} from "lucide-react";
import type {
    ChatV2Friend,
    ChatV2UserNotification,
} from "@/communication/chatV2/_types";
import { getDisplayName } from "@/common/utils/displayName";
import { formatRelativeTime } from "@/common/utils/relativeTime";

const MENTION_TOKEN_RE = /<@(\d+|everyone)>/g;

function resolveMentionTokens(
    content: string,
    resolver?: (userId: number) => string | null,
): string {
    return content.replace(MENTION_TOKEN_RE, (_match, captured: string) => {
        if (captured === "everyone") return "@everyone";
        const userId = Number(captured);
        const name = resolver?.(userId);
        return name ? `@${name}` : "@mention";
    });
}

interface UserNotificationsPanelProps {
    localUserId?: number;
    friendRequests: ChatV2Friend[];
    notifications: ChatV2UserNotification[];
    isLoading: boolean;
    isLoadingNotifications: boolean;
    isMutating: boolean;
    panelClassName?: string;
    resolveUserName?: (userId: number) => string | null;
    onRefresh: () => void;
    onMarkAllRead: () => void;
    onOpenNotification?: (notification: ChatV2UserNotification) => void;
    onRespond: (
        friendshipId: string,
        action: "ACCEPT" | "DECLINE" | "BLOCK",
    ) => void;
}

function FriendRequestItem({
    request,
    isMutating,
    onRespond,
}: {
    request: ChatV2Friend;
    isMutating: boolean;
    onRespond: (friendshipId: string, action: "ACCEPT" | "DECLINE" | "BLOCK") => void;
}) {
    const [showBlock, setShowBlock] = useState(false);
    const displayName = getDisplayName(request.peerUser, `User ${request.peerUser.id}`);

    return (
        <div className="group relative rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--wd-surface-elevated)]">
            <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--wd-accent-rgb)/0.12)]">
                    <UserPlus size={13} className="text-[var(--wd-accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <p className="text-[13px] font-semibold wd-text-primary truncate">
                            {displayName}
                        </p>
                        <span className="shrink-0 text-[11px] wd-text-muted">
                            {formatRelativeTime(request.createdAt)}
                        </span>
                    </div>
                    <p className="text-[11px] wd-text-muted mt-0.5">
                        wants to be friends
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => onRespond(request.friendshipId, "ACCEPT")}
                            className="h-6 rounded-md bg-[rgb(var(--wd-success-rgb)/0.15)] px-2.5 text-[11px] font-semibold text-[var(--wd-success)] transition-colors hover:bg-[rgb(var(--wd-success-rgb)/0.25)] disabled:opacity-50 inline-flex items-center gap-1"
                        >
                            <Check size={11} />
                            Accept
                        </button>
                        <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => onRespond(request.friendshipId, "DECLINE")}
                            className="h-6 rounded-md bg-[var(--wd-surface-elevated)] px-2.5 text-[11px] font-medium wd-text-secondary transition-colors hover:wd-text-primary disabled:opacity-50 inline-flex items-center gap-1"
                        >
                            <X size={11} />
                            Decline
                        </button>
                        {showBlock ? (
                            <button
                                type="button"
                                disabled={isMutating}
                                onClick={() => onRespond(request.friendshipId, "BLOCK")}
                                className="h-6 rounded-md bg-[rgb(var(--wd-danger-rgb)/0.12)] px-2.5 text-[11px] font-semibold text-[var(--wd-danger)] transition-colors hover:bg-[rgb(var(--wd-danger-rgb)/0.22)] disabled:opacity-50 inline-flex items-center gap-1"
                            >
                                <Ban size={10} />
                                Block
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowBlock(true)}
                                className="h-6 px-1 text-[11px] wd-text-muted transition-colors hover:text-[var(--wd-danger)]"
                                title="Show block option"
                            >
                                ...
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function NotificationItem({
    notification,
    resolveUserName,
    onOpen,
}: {
    notification: ChatV2UserNotification;
    resolveUserName?: (userId: number) => string | null;
    onOpen?: (notification: ChatV2UserNotification) => void;
}) {
    const actorName = getDisplayName(
        notification.actorUser,
        `User ${notification.actorUser.id}`,
    );
    const isMention = notification.type === "MENTION";
    const isEveryoneMention = notification.type === "EVERYONE_MENTION";
    const isMentionType = isMention || isEveryoneMention;

    const rawPreview = isMentionType
        ? (notification.rootMessage.content?.trim() || "")
        : (notification.replyMessage?.content?.trim()
            || notification.rootMessage.content?.trim()
            || "");
    const previewText = rawPreview
        ? resolveMentionTokens(rawPreview, resolveUserName)
        : "(no text)";

    const actionLabel = isEveryoneMention
        ? "mentioned @everyone"
        : isMention
            ? "mentioned you"
            : "replied";

    const isUnread = !notification.readAt;
    const NotifIcon = isMentionType ? AtSign : MessageSquareReply;

    return (
        <button
            type="button"
            onClick={() => onOpen?.(notification)}
            className="group w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--wd-surface-elevated)]"
        >
            <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isMentionType
                        ? "bg-[rgb(var(--wd-warning-rgb)/0.12)]"
                        : "bg-[var(--wd-surface-elevated)]"
                }`}>
                    <NotifIcon
                        size={13}
                        className={
                            isMentionType
                                ? "text-[var(--wd-warning)]"
                                : "wd-text-muted"
                        }
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <p className={`text-[13px] truncate ${isUnread ? "font-semibold wd-text-primary" : "font-medium wd-text-secondary"}`}>
                            {actorName}
                        </p>
                        <span className="shrink-0 text-[11px] wd-text-muted">
                            {formatRelativeTime(notification.createdAt)}
                        </span>
                    </div>
                    <p className="text-[11px] wd-text-muted mt-0.5">
                        {actionLabel} in <span className="font-medium wd-text-secondary">#{notification.room.name}</span>
                    </p>
                    <p className={`mt-1 text-[12px] line-clamp-1 ${isUnread ? "wd-text-secondary" : "wd-text-muted"}`}>
                        {previewText}
                    </p>
                </div>
                {isUnread && (
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wd-accent)]" />
                )}
            </div>
        </button>
    );
}

function UserNotificationsPanel({
    localUserId,
    friendRequests,
    notifications,
    isLoading,
    isLoadingNotifications,
    isMutating,
    panelClassName,
    resolveUserName,
    onRefresh,
    onMarkAllRead,
    onOpenNotification,
    onRespond,
}: UserNotificationsPanelProps) {
    const [showOutgoing, setShowOutgoing] = useState(false);

    const incomingRequests = useMemo(() => {
        if (typeof localUserId !== "number") return [];
        return friendRequests.filter(
            (request) => request.requestedByUserId !== localUserId,
        );
    }, [friendRequests, localUserId]);

    const outgoingRequests = useMemo(() => {
        if (typeof localUserId !== "number") return [];
        return friendRequests.filter(
            (request) => request.requestedByUserId === localUserId,
        );
    }, [friendRequests, localUserId]);

    const unreadNotifications = useMemo(
        () => notifications.filter((n) => !n.readAt),
        [notifications],
    );

    const readNotifications = useMemo(
        () => notifications.filter((n) => n.readAt),
        [notifications],
    );

    const totalActionable = incomingRequests.length + unreadNotifications.length;
    const isAllLoading = isLoading && isLoadingNotifications;
    const hasContent = incomingRequests.length > 0 || notifications.length > 0;

    return (
        <div
            data-user-notification-panel="true"
            className={`absolute z-[280] w-[min(24rem,calc(100vw-2rem))] rounded-xl border wd-border-strong wd-bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden ${panelClassName ?? "right-0 bottom-[calc(100%+8px)]"}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b wd-border-subtle">
                <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold wd-text-primary">
                        Notifications
                    </p>
                    {totalActionable > 0 && (
                        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--wd-accent)] px-1 text-[10px] font-bold text-white">
                            {totalActionable}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadNotifications.length > 0 && (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium wd-text-muted transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                            title="Mark all as read"
                        >
                            <CheckCheck size={12} />
                            Read all
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md wd-text-muted transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                        aria-label="Refresh notifications"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            {/* Feed */}
            <div className="max-h-[22rem] overflow-y-auto no-scrollbar">
                {isAllLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <RefreshCw size={16} className="wd-text-muted animate-spin" />
                    </div>
                ) : !hasContent ? (
                    <div className="flex flex-col items-center justify-center py-10 px-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wd-surface-elevated)]">
                            <Inbox size={18} className="wd-text-muted" />
                        </div>
                        <p className="mt-3 text-[13px] font-medium wd-text-secondary">
                            All caught up
                        </p>
                        <p className="mt-1 text-[11px] wd-text-muted text-center">
                            New mentions, replies, and friend requests will show up here.
                        </p>
                    </div>
                ) : (
                    <div className="py-1">
                        {/* Friend requests — action required, always on top */}
                        {incomingRequests.length > 0 && (
                            <div className="px-1 py-1">
                                {incomingRequests.map((request) => (
                                    <FriendRequestItem
                                        key={request.friendshipId}
                                        request={request}
                                        isMutating={isMutating}
                                        onRespond={onRespond}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Separator between friend requests and notifications */}
                        {incomingRequests.length > 0 && notifications.length > 0 && (
                            <div className="mx-4 my-1 border-t wd-border-subtle" />
                        )}

                        {/* Unread notifications */}
                        {unreadNotifications.length > 0 && (
                            <div className="px-1 py-1">
                                {unreadNotifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        resolveUserName={resolveUserName}
                                        onOpen={onOpenNotification}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Read notifications — faded section */}
                        {readNotifications.length > 0 && (
                            <>
                                {unreadNotifications.length > 0 && (
                                    <div className="mx-4 my-1 border-t wd-border-subtle" />
                                )}
                                <div className="px-1 py-1 opacity-70">
                                    {readNotifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            resolveUserName={resolveUserName}
                                            onOpen={onOpenNotification}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Outgoing requests — collapsed footer */}
            {outgoingRequests.length > 0 && (
                <div className="border-t wd-border-subtle">
                    <button
                        type="button"
                        onClick={() => setShowOutgoing((c) => !c)}
                        className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-medium wd-text-muted transition-colors hover:wd-text-secondary"
                    >
                        <span>
                            {outgoingRequests.length} outgoing request{outgoingRequests.length !== 1 ? "s" : ""}
                        </span>
                        <ChevronDown
                            size={12}
                            className={`transition-transform ${showOutgoing ? "rotate-180" : ""}`}
                        />
                    </button>
                    {showOutgoing && (
                        <div className="px-4 pb-2 space-y-1">
                            {outgoingRequests.map((request) => (
                                <div
                                    key={request.friendshipId}
                                    className="flex items-center gap-2 rounded-md bg-[var(--wd-surface-elevated)] px-2.5 py-1.5"
                                >
                                    <span className="text-[12px] wd-text-secondary truncate flex-1">
                                        {getDisplayName(request.peerUser, `User ${request.peerUser.id}`)}
                                    </span>
                                    <span className="shrink-0 text-[10px] wd-text-muted">
                                        Pending
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserNotificationsPanel;
