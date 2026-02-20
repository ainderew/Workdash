import React, { useEffect, useRef } from 'react';

export type MentionSuggestion = {
  userId: number;
  name: string;
  fullName?: string | null;
  nickname?: string | null;
  image?: string | null;
};

interface MentionSuggestionFlyoutProps {
  suggestions: MentionSuggestion[];
  query: string;
  selectedIndex: number;
  onSelect: (suggestion: MentionSuggestion) => void;
  onClose: () => void;
}

function MentionSuggestionFlyout({
  suggestions,
  query,
  selectedIndex,
  onSelect,
  onClose,
}: MentionSuggestionFlyoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Mention suggestions"
      className="absolute bottom-full left-0 right-0 mb-1 z-50 max-h-52 overflow-y-auto rounded-lg border wd-border-strong wd-bg-panel shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide wd-text-muted">
        Members matching @{query || '...'}
      </div>
      {suggestions.map((suggestion, index) => {
        const isSelected = index === selectedIndex;
        const initial = (suggestion.name || 'U').charAt(0).toUpperCase();
        const hasSecondaryName =
          !!suggestion.nickname &&
          !!suggestion.fullName &&
          suggestion.nickname !== suggestion.fullName;

        return (
          <button
            key={suggestion.userId}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(suggestion);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left text-sm transition-colors ${
              isSelected
                ? 'wd-bg-accent-soft wd-text-accent'
                : 'wd-text-primary hover:bg-[var(--wd-surface-elevated)]'
            }`}
          >
            <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden border wd-border-subtle wd-bg-elevated inline-flex items-center justify-center text-xs font-semibold">
              {suggestion.image ? (
                <img
                  src={suggestion.image}
                  alt={`${suggestion.name} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="wd-text-secondary">{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate">{suggestion.name}</p>
              {hasSecondaryName && (
                <p className="truncate text-[11px] wd-text-muted">
                  {suggestion.fullName}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default MentionSuggestionFlyout;
