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
    <div className="py-2">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-medium wd-text-primary">{label}</span>
        <span
          className="text-[10px] font-bold tabular-nums rounded-md px-2 py-0.5"
          style={{
            backgroundColor: 'var(--wd-accent-soft)',
            color: 'var(--wd-accent)',
          }}
        >
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
        className="wd-settings-slider w-full h-[5px] rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-default"
        style={{
          background: `linear-gradient(to right, var(--wd-accent) 0%, var(--wd-accent) ${percentage}%, var(--wd-surface-elevated) ${percentage}%, var(--wd-surface-elevated) 100%)`,
        }}
      />
    </div>
  );
}

export default SettingsSlider;
