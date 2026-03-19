import React from 'react';
import { Headphones, HeadphoneOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFocusToggle } from '@/common/hooks/useFocusToggle';

export default function FocusToggleButton() {
  const { isInFocusMode, toggleFocusMode } = useFocusToggle();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={isInFocusMode ? 'Disable Focus Mode' : 'Enable Focus Mode'}
          onClick={toggleFocusMode}
          className="relative h-7 w-7 inline-flex items-center justify-center rounded-md border wd-bg-elevated transition-colors hover:bg-[var(--wd-surface-base)]"
          style={{
            borderColor: isInFocusMode
              ? 'var(--wd-warning)'
              : 'var(--wd-border-subtle)',
          }}
        >
          {isInFocusMode ? (
            <HeadphoneOff
              size={15}
              style={{ color: 'var(--wd-warning)' }}
            />
          ) : (
            <Headphones
              size={15}
              style={{ color: 'var(--wd-text-secondary)' }}
            />
          )}

          {/* Status dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--wd-surface-panel)] wd-focus-dot-transition"
            style={{
              backgroundColor: isInFocusMode
                ? 'var(--wd-warning)'
                : 'var(--wd-success)',
            }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{isInFocusMode ? 'Disable Focus Mode' : 'Enable Focus Mode'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
