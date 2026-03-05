import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Workspace } from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { extractInviteCode } from "@/common/utils/workspaceDisplay";
import DeskModalShell from "./DeskModalShell";

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
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCodeValue(prefillCode ?? "");
            setError(null);
            setIsJoining(false);
        }
    }, [isOpen, prefillCode]);

    const handleJoin = async () => {
        const code = extractInviteCode(codeValue);
        if (!code) {
            setError("Please enter an invite code or link.");
            return;
        }

        setIsJoining(true);
        setError(null);
        try {
            const service = ChatV2Service.getInstance();
            const workspace = await service.joinWorkspaceByInvite(code);
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

    return (
        <DeskModalShell
            isOpen={isOpen}
            title="Join a Workspace"
            subtitle="Enter an invite code or paste a full invite link."
            onClose={onClose}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary mb-2">
                        Invite Code or Link
                    </label>
                    <input
                        type="text"
                        value={codeValue}
                        onChange={(e) => setCodeValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isJoining) void handleJoin();
                        }}
                        placeholder="e.g. abc123 or https://..."
                        autoFocus
                        disabled={isJoining}
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
                        disabled={isJoining}
                        className="wd-btn-ghost"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleJoin}
                        disabled={isJoining || !codeValue.trim()}
                        className="wd-btn-primary inline-flex items-center gap-2"
                    >
                        {isJoining ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Joining...
                            </>
                        ) : (
                            "Join Workspace"
                        )}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default JoinByInviteModal;
