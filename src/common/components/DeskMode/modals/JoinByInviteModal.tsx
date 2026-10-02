import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Users } from "lucide-react";
import type { Workspace } from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { extractInviteCode, toWorkspaceInitials } from "@/common/utils/workspaceDisplay";
import { tokenStore } from "@/common/utils/tokenStore";
import { CONFIG } from "@/common/utils/config";
import { trackEvent } from "@/common/utils/trackEvent";
import DeskModalShell from "./DeskModalShell";

interface InvitePreview {
    name: string;
    iconUrl: string | null;
    memberCount: number;
    inviterName: string | null;
    inviterAvatarUrl: string | null;
}

interface JoinByInviteModalProps {
    isOpen: boolean;
    prefillCode?: string;
    onClose: () => void;
    onJoined: (workspace: Workspace) => void;
}

function JoinByInviteModal({
    isOpen,
    prefillCode,
    onClose,
    onJoined,
}: JoinByInviteModalProps) {
    const [codeValue, setCodeValue] = useState("");
    const [resolvedCode, setResolvedCode] = useState<string | null>(null);
    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCodeValue(prefillCode ?? "");
            setError(null);
            setIsJoining(false);
            setIsFetching(false);
            setPreview(null);
            setResolvedCode(null);
        }
    }, [isOpen, prefillCode]);

    // Auto-lookup when opened with a prefill code
    useEffect(() => {
        if (!isOpen || !prefillCode) return;
        void handleLookup(prefillCode);
    }, [isOpen, prefillCode]);

    const handleLookup = async (overrideCode?: string) => {
        const code = extractInviteCode(overrideCode ?? codeValue);
        if (!code) {
            setError("Please enter an invite code or link.");
            return;
        }

        setIsFetching(true);
        setError(null);
        setPreview(null);
        try {
            const headers: Record<string, string> = {};
            const jwt = tokenStore.getJwt();
            if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

            const res = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/invites/${encodeURIComponent(code)}/metadata`,
                { headers },
            );
            if (!res.ok) {
                setError("Failed to look up invite.");
                return;
            }
            const data = await res.json();
            if (!data.valid) {
                setError(data.reason || "This invite is no longer valid.");
                return;
            }
            setResolvedCode(code);
            setPreview({
                name: data.workspace.name,
                iconUrl: data.workspace.iconUrl,
                memberCount: data.workspace.memberCount,
                inviterName: data.inviter?.name ?? null,
                inviterAvatarUrl: data.inviter?.avatarUrl ?? null,
            });
        } catch {
            setError("Failed to look up invite.");
        } finally {
            setIsFetching(false);
        }
    };

    const handleJoin = async () => {
        const code = resolvedCode ?? extractInviteCode(codeValue);
        if (!code) return;

        setIsJoining(true);
        setError(null);
        try {
            const service = ChatV2Service.getInstance();
            const workspace = await service.joinWorkspaceByInvite(code);
            trackEvent("invite_joined", { from: "join_modal" });
            onJoined(workspace);
            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join workspace",
            );
        } finally {
            setIsJoining(false);
        }
    };

    const handleBack = () => {
        setPreview(null);
        setResolvedCode(null);
        setError(null);
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            title={preview ? preview.name : "Join a Workspace"}
            subtitle={
                preview
                    ? undefined
                    : "Enter an invite code or paste a full invite link."
            }
            onClose={onClose}
        >
            {/* Preview step */}
            {preview ? (
                <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="w-16 h-16 rounded-[14px] wd-bg-elevated flex items-center justify-center text-xl font-bold wd-text-primary overflow-hidden shrink-0">
                            {preview.iconUrl ? (
                                <Image
                                    src={preview.iconUrl}
                                    alt=""
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>{toWorkspaceInitials(preview.name)}</span>
                            )}
                        </div>
                        <span className="text-base font-semibold wd-text-primary text-center">
                            {preview.name}
                        </span>
                        <div className="flex items-center gap-1.5 wd-text-muted text-xs">
                            <Users size={12} />
                            <span>
                                {preview.memberCount} member
                                {preview.memberCount !== 1 ? "s" : ""}
                            </span>
                        </div>
                        {preview.inviterName && (
                            <div className="flex items-center gap-1.5 text-xs wd-text-secondary">
                                {preview.inviterAvatarUrl ? (
                                    <Image
                                        src={preview.inviterAvatarUrl}
                                        alt=""
                                        width={16}
                                        height={16}
                                        unoptimized
                                        className="w-4 h-4 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-4 h-4 rounded-full wd-bg-elevated" />
                                )}
                                <span>Invited by {preview.inviterName}</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                            {error}
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isJoining}
                            className="wd-btn-ghost"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleJoin}
                            disabled={isJoining}
                            className="wd-btn-primary inline-flex items-center gap-2"
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                `Join ${preview.name}`
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                /* Code input step */
                <div className="space-y-4">
                    {isFetching ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <Loader2 size={24} className="animate-spin wd-text-accent" />
                            <span className="text-sm wd-text-muted">Looking up invite...</span>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary mb-2">
                                    Invite Code or Link
                                </label>
                                <input
                                    type="text"
                                    value={codeValue}
                                    onChange={(e) => setCodeValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !isFetching)
                                            void handleLookup();
                                    }}
                                    placeholder="e.g. abc123 or https://..."
                                    autoFocus
                                    disabled={isFetching}
                                    className="wd-input"
                                />
                            </div>

                            {error && (
                                <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                                    {error}
                                </p>
                            )}

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isFetching}
                                    className="wd-btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleLookup()}
                                    disabled={isFetching || !codeValue.trim()}
                                    className="wd-btn-primary inline-flex items-center gap-2"
                                >
                                    Continue
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </DeskModalShell>
    );
}

export default JoinByInviteModal;
