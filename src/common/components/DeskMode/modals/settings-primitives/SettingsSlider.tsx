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

function SettingsSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  disabled = false,
}: SettingsSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium wd-text-primary">{label}</span>
        <span className="text-[10px] font-medium wd-text-muted">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-default"
        style={{
          background: `linear-gradient(to right, rgba(88,101,242,0.7) 0%, rgba(88,101,242,0.7) ${percentage}%, var(--wd-surface-elevated) ${percentage}%, var(--wd-surface-elevated) 100%)`,
        }}
      />
    </div>
  );
}

export default SettingsSlider;
