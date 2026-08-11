import React, { useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import UserAvatar from './UserAvatar';
import CustomStatusEmoji from '@/common/components/CustomStatus/CustomStatusEmoji';
import { useCustomStatus } from '@/common/components/CustomStatus/useCustomStatus';
const EVERYONE_SENTINEL_ID = -1;

/**
 * The metadata line under a member's name. Full name and custom status share
 * one row rather than stacking — a third line would halve how many people fit
 * in the flyout, and picking the right person is the task here.
 *
 * Identity leads: when space runs out both halves ellipsize, but the full name
 * is what disambiguates two people with the same nickname.
 */
function SuggestionMeta({
  userId,
  secondaryName,
  isSelected,
}: {
  userId: number;
  secondaryName?: string | null;
  isSelected: boolean;
}) {
  const status = useCustomStatus(userId);

  if (!secondaryName && !status) return null;

  // Muted ink over the accent-soft highlight falls to 3.8:1 in the light
  // theme — under the 4.5:1 floor. Step up to secondary ink when selected.
  return (
    <p
      className={`flex min-w-0 items-center gap-1.5 text-[11px] ${
        isSelected ? 'wd-text-secondary' : 'wd-text-muted'
      }`}
    >
      {secondaryName && <span className="truncate">{secondaryName}</span>}
      {secondaryName && status && (
        <span aria-hidden="true" className="shrink-0 opacity-40">
          &middot;
        </span>
      )}
      {status && (
        <span className="flex min-w-0 items-center gap-1">
          {status.emoji && (
            <CustomStatusEmoji
              emoji={status.emoji}
              size={12}
              className="shrink-0"
            />
          )}
          {status.text && <span className="truncate">{status.text}</span>}
        </span>
      )}
    </p>
  );
}

export type MentionSuggestion = {
  userId: number;
  name: string;
  fullName?: string | null;
  nickname?: string | null;
  image?: string | null;
  cooldownSeconds?: number;
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
        const isEveryone = suggestion.userId === EVERYONE_SENTINEL_ID;
        const isOnCooldown = isEveryone && !!suggestion.cooldownSeconds && suggestion.cooldownSeconds > 0;
        const hasSecondaryName =
          !isEveryone &&
          !!suggestion.nickname &&
          !!suggestion.fullName &&
          suggestion.nickname !== suggestion.fullName;

        return (
          <button
            key={isEveryone ? 'everyone' : suggestion.userId}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-disabled={isOnCooldown || undefined}
            onMouseDown={(event) => {
              event.preventDefault();
              if (isOnCooldown) return;
              onSelect(suggestion);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left text-sm transition-colors ${
              isOnCooldown
                ? 'opacity-50 cursor-not-allowed pointer-events-auto'
                : isSelected
                  ? 'wd-bg-accent-soft wd-text-accent'
                  : 'wd-text-primary hover:bg-[var(--wd-surface-elevated)]'
            }`}
          >
            {isEveryone ? (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--wd-accent-soft)]">
                <Users size={14} className="text-[var(--wd-accent)]" />
              </div>
            ) : (
              <UserAvatar
                name={suggestion.name || 'U'}
                image={suggestion.image}
                size="xs"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate">{suggestion.name}</p>
              {isEveryone && (
                <p className="truncate text-[11px] wd-text-muted">
                  {isOnCooldown
                    ? `Available in ${suggestion.cooldownSeconds}s`
                    : suggestion.fullName}
                </p>
              )}
              {!isEveryone && (
                <SuggestionMeta
                  userId={suggestion.userId}
                  secondaryName={
                    hasSecondaryName ? suggestion.fullName : null
                  }
                  isSelected={isSelected}
                />
              )}
            </div>
            {isOnCooldown && (
              <span className="shrink-0 rounded-full border border-[var(--wd-border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--wd-text-muted)]">
                {suggestion.cooldownSeconds}s
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default MentionSuggestionFlyout;
