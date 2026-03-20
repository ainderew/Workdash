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
          className={`relative wd-dock-action-btn ${
            isInFocusMode
              ? 'wd-dock-action-btn--warning'
              : ''
          }`}
        >
          {isInFocusMode ? (
            <HeadphoneOff size={15} />
          ) : (
            <Headphones size={15} />
          )}

          {/* Status dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--wd-surface-panel)] wd-focus-dot-transition ${
              isInFocusMode
                ? 'bg-[var(--wd-warning)]'
                : 'bg-[var(--wd-success)]'
            }`}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{isInFocusMode ? 'Disable Focus Mode' : 'Enable Focus Mode'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
