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
      <label className="text-xs font-semibold uppercase tracking-wide wd-text-muted">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="mt-1 h-10 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)] disabled:opacity-50"
      />
    </div>
  );
}

export default SettingsTextField;
