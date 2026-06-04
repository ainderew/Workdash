import React from "react";
import { Phone, Check, X, Moon, MoreHorizontal } from "lucide-react";
import useReadyCheckStore, {
    selectSnapshotByCheckId,
} from "@/common/store/readyCheckStore";
import useUserStore from "@/common/store/useStore";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReadyCheckClientService } from "@/communication/readyCheck/readyCheckService";
import type {
    ReadyCheckResolvedReason,
    ReadyCheckResponseState,
} from "@/communication/readyCheck/_types";
import { useReadyCheckCountdown } from "./useReadyCheckCountdown";

interface ReadyCheckBotCardProps {
    checkId: string;
    channelId: string;
}

const STATE_STYLES: Record<
    ReadyCheckResponseState,
    { color: string; icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>; label: string }
> = {
    ready: { color: "var(--wd-success)", icon: Check, label: "Ready" },
    "not-ready": { color: "var(--wd-danger)", icon: X, label: "Not Ready" },
    focused: { color: "var(--wd-warning)", icon: Moon, label: "Focused" },
    pending: {
        color: "var(--wd-text-muted)",
        icon: MoreHorizontal,
        label: "Pending",
    },
};

const STATE_ORDER: ReadyCheckResponseState[] = [
    "ready",
    "not-ready",
    "focused",
    "pending",
];

function formatResolvedReason(
    reason: ReadyCheckResolvedReason | null,
    invokerName: string,
): string {
    switch (reason) {
        case "all-responded":
            return "Done";
        case "timeout":
            return "Timed out";
        case "cancelled":
            return `Cancelled by ${invokerName}`;
        case "call-ended":
            return "Call ended";
        default:
            return "";
    }
}

function ReadyCheckBotCard({ checkId }: ReadyCheckBotCardProps) {
    const snapshot = useReadyCheckStore((s) =>
        selectSnapshotByCheckId(s, checkId),
    );
    const localUserId = useUserStore((s) => s.backendUser?.id);
    const remaining = useReadyCheckCountdown(
        snapshot && !snapshot.resolved ? snapshot.expiresAt : null,
    );

    if (!snapshot) {
        return (
            <div className="rounded-lg wd-bg-elevated wd-border-subtle border p-3 text-xs wd-text-muted max-w-[420px]">
                Ready check no longer available.
            </div>
        );
    }

    const counts: Record<ReadyCheckResponseState, number> = {
        ready: 0,
        "not-ready": 0,
        focused: 0,
        pending: 0,
    };
    for (const t of snapshot.targets) counts[t.state] += 1;

    const isInvoker = localUserId === snapshot.invokerUserId;
    const canCancel = isInvoker && !snapshot.resolved;

    const handleCancel = () => {
        void ReadyCheckClientService.getInstance().cancel(snapshot.checkId);
    };

    return (
        <div className="rounded-lg wd-bg-elevated wd-border-subtle border p-3 max-w-[420px]">
            <header className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Phone
                        size={14}
                        className={
                            snapshot.resolved
                                ? "wd-text-muted"
                                : "text-[var(--wd-success)] motion-safe:animate-pulse"
                        }
                    />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-xs font-semibold wd-text-primary cursor-help truncate">
                                Ready Check by {snapshot.invokerDisplayName}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            Started at{" "}
                            {new Date(snapshot.startedAt).toLocaleTimeString()}
                            {" · "}
                            {Math.round(snapshot.timeoutMs / 1000)}s timeout
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono wd-text-muted tabular-nums">
                        {snapshot.resolved
                            ? formatResolvedReason(
                                  snapshot.resolvedReason,
                                  snapshot.invokerDisplayName,
                              )
                            : `${remaining}s left`}
                    </span>
                    {canCancel && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[10px] wd-text-muted hover:wd-text-primary transition-colors px-1.5 py-0.5 rounded hover:wd-bg-panel"
                            aria-label="Cancel ready check"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </header>

            <div className="flex gap-1.5 flex-wrap mb-2">
                {STATE_ORDER.map((state) => {
                    const style = STATE_STYLES[state];
                    return (
                        <span
                            key={state}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold wd-bg-panel"
                            style={{ color: style.color }}
                        >
                            {style.label} {counts[state]}
                        </span>
                    );
                })}
            </div>

            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                {snapshot.targets.map((t) => {
                    const { color, icon: Icon } = STATE_STYLES[t.state];
                    return (
                        <li
                            key={t.userId}
                            className="flex items-center gap-1.5 text-[11px] wd-text-secondary truncate"
                        >
                            <Icon size={10} style={{ color }} className="shrink-0" />
                            <span className="truncate">{t.displayName}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default ReadyCheckBotCard;
