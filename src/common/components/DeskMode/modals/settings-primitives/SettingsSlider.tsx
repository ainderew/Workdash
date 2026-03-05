import React from 'react';

interface SettingsSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

export function SettingsSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  disabled = false,
}: SettingsSliderProps) {
  const displayValue = formatValue ? formatValue(value) : String(value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium wd-text-primary">{label}</span>
        <span className="text-xs font-semibold tabular-nums wd-text-muted min-w-[3ch] text-right">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, var(--wd-accent) 0%, var(--wd-accent) ${percent}%, var(--wd-surface-elevated) ${percent}%, var(--wd-surface-elevated) 100%)`,
        }}
      />
    </div>
  );
}
