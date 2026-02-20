import React, { useMemo } from "react";
import {
    AtSign,
    Ban,
    Check,
    Inbox,
    MessageSquareReply,
    RefreshCw,
    X,
} from "lucide-react";
import type {
    ChatV2Friend,
    ChatV2UserNotification,
} from "@/communication/chatV2/_types";
import { getDisplayName } from "@/common/utils/displayName";

interface UserNotificationsPanelProps {
    localUserId?: number;
    friendRequests: ChatV2Friend[];
    notifications: ChatV2UserNotification[];
    isLoading: boolean;
    isLoadingNotifications: boolean;
    isMutating: boolean;
    panelClassName?: string;
    onRefresh: () => void;
    onMarkAllRead: () => void;
    onOpenNotification?: (notification: ChatV2UserNotification) => void;
    onRespond: (
        friendshipId: string,
        action: "ACCEPT" | "DECLINE" | "BLOCK",
    ) => void;
}

function UserNotificationsPanel({
    localUserId,
    friendRequests,
    notifications,
    isLoading,
    isLoadingNotifications,
    isMutating,
    panelClassName,
    onRefresh,
    onMarkAllRead,
    onOpenNotification,
    onRespond,
}: UserNotificationsPanelProps) {
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
        () => notifications.filter((notification) => !notification.readAt),
        [notifications],
    );

    return (
        <div
            data-user-notification-panel="true"
            className={`absolute z-[280] w-[min(22rem,calc(100vw-2rem))] rounded-xl border wd-border-strong wd-bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden ${panelClassName ?? "right-0 bottom-[calc(100%+8px)]"}`}
        >
            <div className="h-10 px-3 border-b wd-border-subtle flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide wd-text-primary">
                    User Notifications
                </p>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary"
                    aria-label="Refresh notifications"
                >
                    <RefreshCw size={13} />
                </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-3">
                <section>
                    <p className="px-1 pb-1 text-[11px] uppercase tracking-wide wd-text-muted">
                        Friend Requests
                    </p>

                    {isLoading ? (
                        <p className="px-2 py-2 text-xs wd-text-muted">
                            Loading friend requests...
                        </p>
                    ) : incomingRequests.length === 0 ? (
                        <p className="px-2 py-2 text-xs wd-text-muted">
                            No pending friend requests.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {incomingRequests.map((request) => (
                                <div
                                    key={request.friendshipId}
                                    className="rounded-md border wd-border-subtle wd-bg-elevated px-2 py-2"
                                >
                                    <p className="text-xs font-semibold wd-text-primary truncate">
                                        {getDisplayName(
                                            request.peerUser,
                                            `User ${request.peerUser.id}`,
                                        )}
                                    </p>
                                    <p className="text-[11px] wd-text-muted">
                                        sent you a friend request
                                    </p>
                                    <div className="mt-2 grid grid-cols-3 gap-1">
                                        <button
                                            type="button"
                                            disabled={isMutating}
                                            onClick={() =>
                                                onRespond(request.friendshipId, "ACCEPT")
                                            }
                                            className="h-7 rounded-md border border-emerald-700 bg-emerald-950/50 text-emerald-300 text-[11px] font-semibold transition-colors hover:bg-emerald-900/60 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                                        >
                                            <Check size={11} />
                                            Accept
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isMutating}
                                            onClick={() =>
                                                onRespond(request.friendshipId, "DECLINE")
                                            }
                                            className="h-7 rounded-md border wd-border-subtle wd-bg-panel-2 text-xs font-semibold wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)] disabled:opacity-60 inline-flex items-center justify-center gap-1"
                                        >
                                            <X size={11} />
                                            Decline
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isMutating}
                                            onClick={() =>
                                                onRespond(request.friendshipId, "BLOCK")
                                            }
                                            className="h-7 rounded-md border border-red-700 bg-red-950/50 text-red-300 text-[11px] font-semibold transition-colors hover:bg-red-900/60 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                                        >
                                            <Ban size={11} />
                                            Block
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <p className="px-1 pb-1 text-[11px] uppercase tracking-wide wd-text-muted">
                        Outgoing Requests
                    </p>
                    {outgoingRequests.length === 0 ? (
                        <p className="px-2 py-2 text-xs wd-text-muted">
                            No outgoing requests.
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {outgoingRequests.map((request) => (
                                <div
                                    key={request.friendshipId}
                                className="rounded-md border wd-border-subtle wd-bg-elevated px-2 py-1.5"
                            >
                                <p className="text-xs wd-text-primary truncate">
                                        {getDisplayName(
                                            request.peerUser,
                                            `User ${request.peerUser.id}`,
                                        )}
                                </p>
                                    <p className="text-[11px] wd-text-muted">
                                        Waiting for response
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <div className="px-1 pb-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-wide wd-text-muted">
                            Other Notifications
                        </p>
                        {unreadNotifications.length > 0 ? (
                            <button
                                type="button"
                                onClick={onMarkAllRead}
                                className="text-[11px] wd-text-secondary transition-colors hover:wd-text-primary"
                            >
                                Mark all read
                            </button>
                        ) : null}
                    </div>

                    {isLoadingNotifications ? (
                        <p className="px-2 py-2 text-xs wd-text-muted">
                            Loading notifications...
                        </p>
                    ) : notifications.length === 0 ? (
                        <div className="rounded-md border wd-border-subtle wd-bg-elevated px-2 py-2">
                            <p className="text-xs wd-text-secondary inline-flex items-center gap-1">
                                <Inbox size={12} />
                                No other user notifications yet.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {notifications.map((notification) => {
                                const actorName =
                                    getDisplayName(
                                        notification.actorUser,
                                        `User ${notification.actorUser.id}`,
                                    );
                                const isMention = notification.type === "MENTION";
                                const previewText = isMention
                                    ? (notification.rootMessage.content?.trim() || "(no text)")
                                    : (notification.replyMessage?.content?.trim()
                                        || notification.rootMessage.content?.trim()
                                        || "(no text)");
                                const notificationLabel = isMention
                                    ? `${actorName} mentioned you in #${notification.room.name}`
                                    : `${actorName} replied in #${notification.room.name}`;
                                const NotificationIcon = isMention
                                    ? AtSign
                                    : MessageSquareReply;

                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() => onOpenNotification?.(notification)}
                                        className={`w-full rounded-md border px-2 py-2 text-left transition-colors ${
                                            notification.readAt
                                                ? "wd-border-subtle wd-bg-elevated"
                                                : "wd-border-strong wd-bg-[var(--wd-accent-soft)]"
                                        }`}
                                    >
                                        <p className="text-xs font-semibold wd-text-primary inline-flex items-center gap-1">
                                            <NotificationIcon size={11} />
                                            {notificationLabel}
                                        </p>
                                        <p className="mt-1 text-[11px] wd-text-secondary line-clamp-2">
                                            {previewText}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default UserNotificationsPanel;
