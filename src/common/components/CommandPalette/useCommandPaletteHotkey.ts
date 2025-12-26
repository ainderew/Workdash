import { useEffect } from 'react';
import useUiStore from '@/common/store/uiStore';

export function useCommandPaletteHotkey() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Shift+Enter
      if (e.key === 'Enter' && e.shiftKey) {
        // Don't trigger if user is typing in input fields
        const activeElement = document.activeElement;
        const isTyping =
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement)?.isContentEditable;

        if (isTyping) {
          return;
        }

        // Don't trigger if already open
        const { isCommandPaletteOpen } = useUiStore.getState();
        if (isCommandPaletteOpen) {
          return;
        }

        // Prevent default behavior and stop propagation
        e.preventDefault();
        e.stopPropagation();

        // Open command palette
        useUiStore.getState().openCommandPalette();
      }
    };

    // Use capture phase to intercept before React handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
