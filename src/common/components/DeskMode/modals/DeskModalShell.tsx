import React, { useEffect } from "react";
import { X } from "lucide-react";

interface DeskModalShellProps {
    isOpen: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
}

function DeskModalShell({
    isOpen,
    title,
    subtitle,
    onClose,
    children,
}: DeskModalShellProps) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
            <div className="w-full max-w-md rounded-xl border wd-border-strong wd-bg-panel wd-text-primary shadow-[0_20px_48px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between px-6 pt-5">
                    <div className="pr-3">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-1 text-sm wd-text-secondary">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        aria-label="Close modal"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:text-[var(--wd-text-primary)]"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 pb-6 pt-4">{children}</div>
            </div>
        </div>
    );
}

export default DeskModalShell;
