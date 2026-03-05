import React from 'react';

interface SettingsTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function SettingsTextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
}: SettingsTextFieldProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide wd-text-muted">
          {label}
        </label>
        {maxLength && (
          <span
            className={`text-[10px] tabular-nums transition-colors ${
              value.length >= maxLength
                ? 'text-[var(--wd-danger)]'
                : 'wd-text-muted'
            }`}
          >
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
        className="h-10 w-full rounded-lg border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none transition-colors focus:border-[var(--wd-accent)] focus:ring-1 focus:ring-[var(--wd-accent-soft)] disabled:opacity-50"
      />
    </div>
  );
}
