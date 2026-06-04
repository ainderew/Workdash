import React, { useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import useReadyCheckStore, {
    selectSnapshotByCheckId,
} from "@/common/store/readyCheckStore";
import useUserStore from "@/common/store/useStore";
import { Button } from "@/components/ui/button";
import { ReadyCheckClientService } from "@/communication/readyCheck/readyCheckService";
import { useReadyCheckCountdown } from "./useReadyCheckCountdown";

function ReadyCheckOverlay() {
    const activePromptCheckId = useReadyCheckStore(
        (s) => s.activePromptCheckId,
    );
    const snapshot = useReadyCheckStore((s) =>
        selectSnapshotByCheckId(s, activePromptCheckId),
    );
    const localResponse = useReadyCheckStore((s) =>
        activePromptCheckId
            ? s.localResponseByCheckId[activePromptCheckId]
            : undefined,
    );
    const localUserId = useUserStore((s) => s.backendUser?.id);
    const remaining = useReadyCheckCountdown(snapshot?.expiresAt ?? null);

    const readyButtonRef = useRef<HTMLButtonElement>(null);
    const notReadyButtonRef = useRef<HTMLButtonElement>(null);

    // Auto-focus the Ready button when the prompt opens
    useEffect(() => {
        if (activePromptCheckId) {
            readyButtonRef.current?.focus();
        }
    }, [activePromptCheckId]);

    if (!activePromptCheckId || !snapshot || snapshot.resolved) return null;

    const localTarget = snapshot.targets.find((t) => t.userId === localUserId);
    if (!localTarget || localTarget.state !== "pending") return null;

    const handleRespond = (ready: boolean) => {
        void ReadyCheckClientService.getInstance().respond(
            snapshot.checkId,
            ready,
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            handleRespond(false);
            return;
        }
        if (e.key === "Tab") {
            const active = document.activeElement;
            if (e.shiftKey) {
                if (active === readyButtonRef.current) {
                    e.preventDefault();
                    notReadyButtonRef.current?.focus();
                }
            } else {
                if (active === notReadyButtonRef.current) {
                    e.preventDefault();
                    readyButtonRef.current?.focus();
                }
            }
        }
    };

    const disabled = localResponse !== undefined;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ready-check-title"
            onKeyDown={handleKeyDown}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0"
        >
            <div className="w-[360px] rounded-2xl wd-bg-panel wd-border-strong border shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wd-success)] motion-safe:animate-pulse">
                        <Phone size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h2
                            id="ready-check-title"
                            className="text-base font-semibold wd-text-primary"
                        >
                            Ready Check
                        </h2>
                        <p className="text-xs wd-text-muted">
                            {snapshot.invokerDisplayName} is asking
                        </p>
                    </div>
                    <span
                        className="text-xs font-mono wd-text-muted tabular-nums"
                        aria-label={`${remaining} seconds remaining`}
                    >
                        {remaining}s
                    </span>
                </div>

                <p className="text-sm wd-text-secondary mb-5">Are you ready?</p>

                <div className="flex gap-2">
                    <Button
                        ref={readyButtonRef}
                        type="button"
                        onClick={() => handleRespond(true)}
                        disabled={disabled}
                        className="flex-1 bg-[var(--wd-success)] hover:bg-[var(--wd-success)]/90 text-white"
                    >
                        Ready
                    </Button>
                    <Button
                        ref={notReadyButtonRef}
                        type="button"
                        variant="outline"
                        onClick={() => handleRespond(false)}
                        disabled={disabled}
                        className="flex-1 border-[var(--wd-danger)] text-[var(--wd-danger)] hover:bg-[var(--wd-danger)]/10"
                    >
                        Not Ready
                    </Button>
                </div>

                <p className="text-[10px] wd-text-muted mt-4 text-center">
                    Auto-resolves to Not Ready when the timer ends.
                </p>
            </div>
        </div>
    );
}

export default ReadyCheckOverlay;
