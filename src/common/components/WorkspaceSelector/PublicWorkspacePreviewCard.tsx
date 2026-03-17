import React, { useState } from "react";
import Image from "next/image";
import { Clock, Loader2, Users } from "lucide-react";
import { toWorkspaceInitials } from "@/common/utils/workspaceDisplay";
import type { PublicWorkspacePreview } from "@/communication/chatV2/_types";

type Props = {
    workspace: PublicWorkspacePreview;
    index: number;
    onRequestJoin: (workspaceId: string) => Promise<void>;
};

function PublicWorkspacePreviewCard({ workspace, index, onRequestJoin }: Props) {
    const [isRequesting, setIsRequesting] = useState(false);
    const [localStatus, setLocalStatus] = useState(workspace.joinRequestStatus);

    const handleRequest = async () => {
        setIsRequesting(true);
        try {
            await onRequestJoin(workspace.id);
            setLocalStatus("PENDING");
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <div
            className="wd-ws-card-enter group rounded-2xl border wd-border-subtle wd-bg-panel p-5 flex flex-col items-center gap-2.5 min-h-[172px] transition-all duration-200 hover:border-[var(--wd-border-strong)] hover:-translate-y-0.5"
            style={{
                animationDelay: `${index * 60}ms`,
            }}
        >
            {/* Hover glow */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    boxShadow: `0 4px 24px -4px rgb(var(--wd-accent-rgb) / 0.1)`,
                }}
            />

            {/* Avatar */}
            <div
                className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-lg font-bold wd-text-primary overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{
                    backgroundColor: "var(--wd-surface-elevated)",
                    boxShadow: `inset 0 1px 2px rgb(0 0 0 / 0.08)`,
                }}
            >
                {workspace.iconUrl ? (
                    <Image
                        src={workspace.iconUrl}
                        alt=""
                        width={52}
                        height={52}
                        unoptimized
                        className="w-full h-full object-cover"
                    />
                ) : (
                    toWorkspaceInitials(workspace.name)
                )}
            </div>

            {/* Name */}
            <span className="text-[13px] font-semibold wd-text-primary text-center w-full truncate leading-tight">
                {workspace.name}
            </span>

            {/* Description */}
            {workspace.description && (
                <p className="text-[11px] wd-text-muted text-center line-clamp-2 leading-relaxed px-1">
                    {workspace.description}
                </p>
            )}

            {/* Member count */}
            <div className="flex items-center gap-1 wd-text-muted text-[11px]">
                <Users size={11} />
                <span>
                    {workspace.memberCount} member
                    {workspace.memberCount !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Action button */}
            <div className="mt-auto pt-1">
                {localStatus === "PENDING" ? (
                    <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg"
                        style={{
                            color: "var(--wd-warning)",
                            backgroundColor: "color-mix(in srgb, var(--wd-warning) 10%, transparent)",
                        }}
                    >
                        <Clock size={11} />
                        Request Pending
                    </span>
                ) : localStatus === "DENIED" ? (
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                        style={{
                            color: "var(--wd-text-primary)",
                            backgroundColor: "color-mix(in srgb, var(--wd-accent) 15%, transparent)",
                        }}
                        onClick={() => {
                            setLocalStatus(null);
                        }}
                        disabled={isRequesting}
                    >
                        Request Again
                    </button>
                ) : (
                    <button
                        type="button"
                        className="wd-btn-primary text-[11px] h-[30px] px-3 inline-flex items-center gap-1.5 rounded-lg"
                        onClick={handleRequest}
                        disabled={isRequesting}
                    >
                        {isRequesting ? (
                            <>
                                <Loader2 size={11} className="animate-spin" />
                                Requesting...
                            </>
                        ) : (
                            "Request to Join"
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

export default PublicWorkspacePreviewCard;
