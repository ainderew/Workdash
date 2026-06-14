import React from 'react';
import { MonitorPlay } from 'lucide-react';

interface StageBannerProps {
  presenterName: string;
  /** This viewer has dropped back to grid while a presenter is still up. */
  optedOut: boolean;
  onToggleOptOut: () => void;
}

/**
 * Slim strip shown while a synced presenter holds the stage. Lets each viewer
 * step back to the grid ("Leave stage") or rejoin ("Return to stage") locally
 * without affecting anyone else.
 */
export default function StageBanner({
  presenterName,
  optedOut,
  onToggleOptOut,
}: StageBannerProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1 text-[11px] border-b wd-border-subtle"
      style={{ backgroundColor: 'rgb(var(--wd-warning-rgb, 245 158 11) / 0.12)' }}
    >
      <MonitorPlay size={13} className="shrink-0 text-[var(--wd-warning,#f59e0b)]" />
      <span className="truncate wd-text-secondary">
        <span className="font-bold wd-text-primary">{presenterName}</span> is presenting
      </span>
      <button
        type="button"
        onClick={onToggleOptOut}
        className="ml-auto shrink-0 rounded-md px-2 py-0.5 font-semibold cursor-pointer transition-colors wd-text-secondary hover:wd-text-primary hover:bg-[color-mix(in_srgb,var(--wd-text-primary)_10%,transparent)]"
      >
        {optedOut ? 'Return to stage' : 'Leave stage'}
      </button>
    </div>
  );
}
