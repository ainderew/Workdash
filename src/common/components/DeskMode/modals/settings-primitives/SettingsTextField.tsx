import React from 'react';

interface SettingsTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

function SettingsTextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
}: SettingsTextFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest wd-text-muted">
          {label}
        </label>
        {maxLength !== undefined && (
          <span className="text-[9px] tabular-nums wd-text-muted opacity-60">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="wd-settings-input h-9 w-full rounded-lg border wd-border-subtle px-3 text-sm wd-text-primary outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)] disabled:opacity-50"
        style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
      />
    </div>
  );
}

export default SettingsTextField;
