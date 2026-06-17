import React from 'react';
import { PROFILE_EFFECTS, type ProfileEffectId } from './profileEffects';

interface ProfileEffectPickerProps {
  value: ProfileEffectId;
  onSelect: (effect: ProfileEffectId) => void;
}

/** Self-only chip row to pick a profile effect; selection applies immediately. */
export function ProfileEffectPicker({
  value,
  onSelect,
}: ProfileEffectPickerProps) {
  return (
    <div className="px-4 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider wd-text-muted">
        Profile effect
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PROFILE_EFFECTS.map((effect) => {
          const isActive = effect.id === value;
          return (
            <button
              key={effect.id}
              type="button"
              onClick={() => onSelect(effect.id)}
              aria-pressed={isActive}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'border-[var(--wd-accent)] bg-[var(--wd-accent-soft)] wd-text-primary'
                  : 'wd-border-subtle wd-text-muted hover:wd-text-primary hover:border-[var(--wd-border-strong)]'
              }`}
            >
              <span aria-hidden="true">{effect.icon}</span>
              {effect.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
