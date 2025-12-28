import React from "react";
import { useEffect, useRef } from "react";
import useUiStore from "@/common/store/uiStore";
import CommandSearch from "./CommandSearch";
import { PollForm } from "./forms/PollForm";

export default function CommandPalette() {
    const isOpen = useUiStore((state) => state.isCommandPaletteOpen);
    const currentCommandForm = useUiStore((state) => state.currentCommandForm);
    const closeCommandPalette = useUiStore(
        (state) => state.closeCommandPalette,
    );
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closeCommandPalette();
            }
        };

        window.addEventListener("keydown", handleEscape, { capture: true });

        return () => {
            window.removeEventListener("keydown", handleEscape, {
                capture: true,
            });
        };
    }, [isOpen, closeCommandPalette]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            closeCommandPalette();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-40"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
        >
            <div className="w-full max-w-2xl mx-4">
                {currentCommandForm === null && <CommandSearch />}
                {currentCommandForm === "poll" && (
                    <PollForm onClose={closeCommandPalette} />
                )}
            </div>
        </div>
    );
}
