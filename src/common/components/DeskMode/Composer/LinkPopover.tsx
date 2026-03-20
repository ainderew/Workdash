import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface LinkPopoverProps {
  editor: Editor;
  onClose: () => void;
}

function LinkPopover({ editor, onClose }: LinkPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-fill with existing link URL if editing
  const existingHref = editor.getAttributes('link').href as string | undefined;
  const [url, setUrl] = useState(existingHref ?? '');

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleApply = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href })
        .run();
    }
    onClose();
  }, [editor, url, onClose]);

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    onClose();
  }, [editor, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        editor.commands.focus();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'input, button:not([disabled])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [handleApply, editor, onClose],
  );

  // Close on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Insert link"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1.5 rounded-xl border wd-border-subtle bg-[var(--wd-surface-panel)] p-1.5 shadow-xl shadow-black/10"
    >
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="h-7 w-56 rounded-lg border wd-border-subtle bg-[var(--wd-surface-base)] px-2.5 text-xs wd-text-primary outline-none motion-safe:transition-shadow motion-safe:duration-200 focus:shadow-[0_0_0_1px_var(--wd-accent)]"
      />
      <button
        type="button"
        onClick={handleApply}
        className="h-7 rounded-lg px-3 text-xs font-medium bg-[var(--wd-accent)] text-white motion-safe:transition-all motion-safe:duration-200 hover:brightness-110 hover:shadow-[0_0_8px_rgb(var(--wd-accent-rgb)/0.3)] active:scale-95"
      >
        Apply
      </button>
      {existingHref && (
        <button
          type="button"
          onClick={handleRemove}
          className="h-7 rounded-lg px-3 text-xs font-medium wd-text-muted motion-safe:transition-colors motion-safe:duration-200 hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
        >
          Remove
        </button>
      )}
    </div>
  );
}

export default LinkPopover;
