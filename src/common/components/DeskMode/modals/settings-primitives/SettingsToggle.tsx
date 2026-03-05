import React from 'react';

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingsToggleProps) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer group">
      <div className="pr-3">
        <span className="text-xs font-medium wd-text-primary">{label}</span>
        {description && (
          <p className="mt-0.5 text-[10px] wd-text-muted">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked
            ? 'bg-[rgba(88,101,242,0.7)]'
            : 'bg-[var(--wd-surface-elevated)]'
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export default SettingsToggle;
