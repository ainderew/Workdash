import React, { useEffect, useRef } from 'react';
import type { CustomEmoji } from '@/common/store/customEmojiStore';

interface EmojiAutocompleteFlyoutProps {
  emojis: CustomEmoji[];
  query: string;
  selectedIndex: number;
  onSelect: (emoji: CustomEmoji) => void;
  onClose: () => void;
}

function EmojiAutocompleteFlyout({
  emojis,
  query,
  selectedIndex,
  onSelect,
  onClose,
}: EmojiAutocompleteFlyoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      onClose();
    };

    const handleFocusOut = (event: FocusEvent) => {
      const related = event.relatedTarget as Node | null;
      if (related && containerRef.current?.contains(related)) return;
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, [onClose]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (emojis.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Emoji suggestions"
      className="absolute bottom-full left-0 right-0 mb-1 z-50 max-h-52 overflow-y-auto rounded-lg border wd-border-strong wd-bg-panel shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide wd-text-muted">
        Emojis matching :{query || '...'}
      </div>
      {emojis.map((emoji, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={emoji.id}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(emoji);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left text-sm transition-colors ${
              isSelected
                ? 'wd-bg-accent-soft wd-text-accent'
                : 'wd-text-primary hover:bg-[var(--wd-surface-elevated)]'
            }`}
          >
            <img
              src={emoji.imageUrl}
              alt={`:${emoji.name}:`}
              className="h-5 w-5 shrink-0 object-contain"
              loading="lazy"
            />
            <span className="truncate">:{emoji.name}:</span>
          </button>
        );
      })}
    </div>
  );
}

export default EmojiAutocompleteFlyout;
