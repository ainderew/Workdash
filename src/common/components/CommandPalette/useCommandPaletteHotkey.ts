import { useEffect } from "react";
import useUiStore from "@/common/store/uiStore";

/**
 * @deprecated This hook is superseded by the centralized keyboard shortcuts
 * module at `@/common/keyboard`. The Shift+Enter command palette shortcut now
 * lives in `shortcutRegistry.ts`. This file is kept temporarily for reference
 * and will be deleted in a follow-up.
 */
export function useCommandPaletteHotkey() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && e.shiftKey) {
                const activeElement = document.activeElement;
                const isTyping =
                    activeElement?.tagName === "INPUT" ||
                    activeElement?.tagName === "TEXTAREA" ||
                    (activeElement as HTMLElement)?.isContentEditable;

                if (isTyping) {
                    return;
                }
                const { isCommandPaletteOpen } = useUiStore.getState();
                if (isCommandPaletteOpen) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                useUiStore.getState().openCommandPalette();
            }
        };

        window.addEventListener("keydown", handleKeyDown, { capture: true });

        return () => {
            window.removeEventListener("keydown", handleKeyDown, {
                capture: true,
            });
        };
    }, []);
}
