import React, { useCallback, useEffect, useState } from "react";
import { Check, Clock, Loader2, MessageSquare, X } from "lucide-react";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";
import type { JoinRequest } from "@/communication/chatV2/_types";

type Props = {
    workspaceId: string;
    onCountChange?: (count: number) => void;
};

function JoinRequestsTab({ workspaceId, onCountChange }: Props) {
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    // Sync count to parent whenever requests change
    useEffect(() => {
        onCountChange?.(requests.length);
    }, [requests.length, onCountChange]);

    const loadRequests = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const service = ChatV2Service.getInstance();
            const data = await service.listJoinRequests(workspaceId);
            setRequests(data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load requests",
            );
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // Listen for new join requests arriving in real-time
    useEffect(() => {
        const transport = MediaTransportService.getInstance();
        const socket = transport.socket;
        if (!socket) return;

        const handleNew = (payload: {
            workspaceId: string;
            request: JoinRequest;
        }) => {
            if (payload.workspaceId !== workspaceId) return;
            setRequests((prev) => {
                // Avoid duplicates
                if (prev.some((r) => r.id === payload.request.id)) return prev;
                return [...prev, payload.request];
            });
        };

        const handleReviewed = (payload: {
            workspaceId: string;
            requestId: string;
        }) => {
            if (payload.workspaceId !== workspaceId) return;
            setRequests((prev) =>
                prev.filter((r) => r.id !== payload.requestId),
            );
        };

        socket.on("workspace:join-request:new", handleNew);
        socket.on("workspace:join-request:reviewed", handleReviewed);
        return () => {
            socket.off("workspace:join-request:new", handleNew);
            socket.off("workspace:join-request:reviewed", handleReviewed);
        };
    }, [workspaceId]);

    const handleReview = async (
        requestId: string,
        decision: "APPROVED" | "DENIED",
    ) => {
        setReviewingId(requestId);
        try {
            const service = ChatV2Service.getInstance();
            await service.reviewJoinRequest(requestId, decision);
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to review request",
            );
        } finally {
            setReviewingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2
                    size={20}
                    className="animate-spin wd-text-muted"
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-4 text-center">
                <p className="text-sm" style={{ color: "var(--wd-danger)" }}>
                    {error}
                </p>
                <button
                    type="button"
                    className="wd-btn-ghost mt-2 text-xs"
                    onClick={loadRequests}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-12 space-y-2">
                <Clock size={24} className="mx-auto wd-text-muted opacity-40" />
                <p className="text-sm wd-text-muted">
                    No pending join requests
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                Pending Requests ({requests.length})
            </p>
            <div className="space-y-1.5">
                {requests.map((req) => {
                    const isReviewing = reviewingId === req.id;
                    const userName = req.user?.name ?? `User #${req.userId}`;
                    const initials = userName.charAt(0).toUpperCase();
                    const createdAt = new Date(req.createdAt);
                    const timeAgo = formatTimeAgo(createdAt);

                    return (
                        <div
                            key={req.id}
                            className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3 flex items-start gap-3"
                        >
                            {/* Avatar */}
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold wd-text-primary shrink-0 overflow-hidden"
                                style={{
                                    backgroundColor:
                                        "var(--wd-surface-elevated)",
                                }}
                            >
                                {req.user?.avatarUrl ? (
                                    <img
                                        src={req.user.avatarUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium wd-text-primary truncate">
                                        {userName}
                                    </span>
                                    <span className="text-[10px] wd-text-muted shrink-0">
                                        {timeAgo}
                                    </span>
                                </div>
                                {req.message && (
                                    <div className="mt-1 flex items-start gap-1.5">
                                        <MessageSquare
                                            size={11}
                                            className="wd-text-muted mt-0.5 shrink-0"
                                        />
                                        <p className="text-xs wd-text-secondary line-clamp-2">
                                            {req.message}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--wd-success)_12%,transparent)]"
                                    style={{ color: "var(--wd-success)" }}
                                    onClick={() =>
                                        handleReview(req.id, "APPROVED")
                                    }
                                    disabled={isReviewing}
                                    title="Approve"
                                >
                                    {isReviewing ? (
                                        <Loader2
                                            size={14}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--wd-danger)_12%,transparent)]"
                                    style={{ color: "var(--wd-danger)" }}
                                    onClick={() =>
                                        handleReview(req.id, "DENIED")
                                    }
                                    disabled={isReviewing}
                                    title="Deny"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function formatTimeAgo(date: Date): string {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

export default JoinRequestsTab;
