import React from 'react';
import type { DotaAwardTagType, AwardTagData } from '@/communication/chatV2/_types';
import AwardTag from './AwardTag';

interface AwardTagSelectorProps {
  availableAwards: AwardTagData[];
  selectedType: DotaAwardTagType | null;
  hidden: boolean;
  onSelect: (type: DotaAwardTagType | null) => void;
  onToggleHidden: (hidden: boolean) => void;
}

function AwardTagSelector({
  availableAwards,
  selectedType,
  hidden,
  onSelect,
  onToggleHidden,
}: AwardTagSelectorProps) {
  if (availableAwards.length === 0) {
    return (
      <div className="text-xs wd-text-muted italic">
        No active awards. Earn awards by playing Dota 2 with your workspace!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Opt-out toggle */}
      <div className="flex items-center justify-between">
        <div id="award-tag-toggle-label">
          <span className="text-sm wd-text-primary font-medium">Show award tag</span>
          <span className="text-xs wd-text-muted block">
            Display your Dota 2 award next to your name
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!hidden}
          aria-labelledby="award-tag-toggle-label"
          onClick={() => onToggleHidden(!hidden)}
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
            !hidden ? 'bg-[var(--wd-accent)]' : 'bg-[var(--wd-surface-elevated)]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-[var(--wd-text-primary)] shadow transition-transform ${
              !hidden ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Award selector — only interactive when not hidden */}
      <div className={hidden ? 'opacity-40 pointer-events-none' : ''}>
        {/* Auto option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-colors text-left ${
            selectedType === null
              ? 'wd-border-accent wd-bg-accent-soft'
              : 'wd-border-subtle hover:bg-white/5'
          }`}
        >
          <div className="flex-1">
            <span className="text-sm wd-text-primary font-medium">Auto</span>
            <span className="text-xs wd-text-muted block">
              Displays your highest-priority award
            </span>
          </div>
          {selectedType === null && (
            <span className="text-xs wd-text-accent font-medium">Active</span>
          )}
        </button>

        {/* Award options */}
        {availableAwards.map((award) => (
          <button
            key={award.type}
            type="button"
            onClick={() => onSelect(award.type)}
            className={`w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-md border transition-colors text-left ${
              selectedType === award.type
                ? 'wd-border-accent wd-bg-accent-soft'
                : 'wd-border-subtle hover:bg-white/5'
            }`}
          >
            <AwardTag type={award.type} label={award.label} size="sm" />
            <div className="flex-1 min-w-0" />
            {selectedType === award.type && (
              <span className="text-xs wd-text-accent font-medium">Active</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AwardTagSelector;
