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
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <div className="pr-4 min-w-0">
        <span className="text-[13px] font-medium wd-text-primary leading-tight">
          {label}
        </span>
        {description && (
          <p className="mt-0.5 text-[11px] wd-text-muted leading-snug">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className="wd-settings-toggle relative h-6 w-[44px] shrink-0 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: checked
            ? 'var(--wd-accent)'
            : 'var(--wd-surface-elevated)',
          boxShadow: checked
            ? '0 0 12px var(--wd-accent-soft), inset 0 1px 2px rgba(0,0,0,0.08)'
            : 'inset 0 2px 4px rgba(0,0,0,0.12)',
        }}
      >
        <span
          className="wd-settings-toggle-thumb absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all duration-200"
          style={{
            left: checked ? '22px' : '3px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.08)',
          }}
        />
      </button>
    </label>
  );
}

export default SettingsToggle;
