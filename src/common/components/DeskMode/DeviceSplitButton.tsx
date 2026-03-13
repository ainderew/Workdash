'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type DeviceSplitSize = 'sm' | 'md' | 'lg';
export type DeviceSplitVariant = 'pill' | 'block';

export interface DeviceSplitButtonProps {
  /** Whether the device is currently off/muted */
  isOff: boolean;
  onToggle: () => void;
  ActiveIcon: LucideIcon;
  InactiveIcon: LucideIcon;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSwitchDevice: (deviceId: string) => Promise<void>;
  /** Display name used for labels: "Microphone" | "Camera" */
  label: string;
  offTitle: string;
  onTitle: string;
  /** Color style for pill variant when off: 'danger' (red) or 'subtle' (grey) */
  pillOffStyle?: 'danger' | 'subtle';
  size?: DeviceSplitSize;
  variant?: DeviceSplitVariant;
}

const iconSizes = {
  sm: { main: 13, chevron: 8 },
  md: { main: 15, chevron: 10 },
  lg: { main: 20, chevron: 14 },
} as const;

const heightClasses = {
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-9',
} as const;

export default function DeviceSplitButton({
  isOff,
  onToggle,
  ActiveIcon,
  InactiveIcon,
  devices,
  selectedDeviceId,
  onSwitchDevice,
  label,
  offTitle,
  onTitle,
  pillOffStyle = 'danger',
  size = 'md',
  variant = 'pill',
}: DeviceSplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { main: mainIcon, chevron } = iconSizes[size];
  const h = heightClasses[size];
  const isPill = variant === 'pill';
  const rounding = isPill ? 'rounded-full' : 'rounded-lg';
  const labelLower = label.toLowerCase();

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleSelect = async (deviceId: string) => {
    if (deviceId === selectedDeviceId || switching) return;
    setSwitching(true);
    try {
      await onSwitchDevice(deviceId);
    } catch (err) {
      console.error(`Failed to switch ${labelLower}:`, err);
    } finally {
      setSwitching(false);
      setIsOpen(false);
    }
  };

  const noDevices = devices.length === 0;

  // OFF state colors
  const useSubtleOff = isPill && pillOffStyle === 'subtle';
  const offBorder = useSubtleOff ? 'wd-border-subtle' : 'border-[var(--wd-danger)]';
  const offText = useSubtleOff ? 'wd-text-secondary' : 'text-[var(--wd-danger)]';
  const offBg = useSubtleOff ? '' : 'bg-[color-mix(in_srgb,var(--wd-danger)_12%,transparent)]';

  // ON state colors
  const onBorder = isPill ? 'wd-border-subtle' : 'border-[var(--wd-success)]';
  const onText = isPill ? 'wd-text-secondary' : 'text-[var(--wd-success)]';
  const onBg = isPill ? '' : 'bg-[color-mix(in_srgb,var(--wd-success)_12%,transparent)]';

  const borderClass = isOff ? offBorder : onBorder;
  const textClass = isOff ? offText : onText;
  const bgClass = isOff ? offBg : onBg;

  const dividerColor = isOff
    ? useSubtleOff
      ? 'bg-[var(--wd-border-subtle)]'
      : 'bg-[color-mix(in_srgb,var(--wd-danger)_30%,transparent)]'
    : isPill
      ? 'bg-[var(--wd-border-subtle)]'
      : 'bg-[color-mix(in_srgb,var(--wd-success)_30%,transparent)]';

  const dividerH = size === 'lg' ? 'h-5' : 'h-4';
  const chevronPx = size === 'lg' ? 'px-2' : 'px-1.5';

  return (
    <div className="relative" ref={containerRef}>
      {/* Split button */}
      <div
        role="group"
        aria-label={`${label} controls`}
        className={`inline-flex items-center ${h} ${rounding} border ${borderClass} ${bgClass} overflow-hidden transition-colors`}
      >
        {/* Toggle (left) */}
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center justify-center ${h} px-2 ${textClass} transition-colors hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]`}
          title={isOff ? offTitle : onTitle}
          aria-pressed={!isOff}
        >
          {isOff ? <InactiveIcon size={mainIcon} /> : <ActiveIcon size={mainIcon} />}
        </button>

        {/* Divider */}
        <div className={`w-px ${dividerH} ${dividerColor}`} />

        {/* Chevron (right) — opens device picker */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={noDevices}
          className={`inline-flex items-center justify-center ${h} ${chevronPx} transition-colors ${
            noDevices
              ? 'opacity-40 cursor-not-allowed'
              : `${textClass} opacity-70 hover:opacity-100 hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]`
          } ${isOpen ? 'bg-[color-mix(in_srgb,currentColor_10%,transparent)]' : ''}`}
          title={noDevices ? `No ${labelLower}s available` : `Select ${labelLower}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <ChevronDown
            size={chevron}
            className={`transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Popover — opens upward */}
      {isOpen && (
        <div
          className="wd-anim-popover-up absolute bottom-full left-1/2 mb-2 z-50 min-w-[220px] max-w-[300px] rounded-lg border shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--wd-surface-overlay)',
            borderColor: 'var(--wd-border-subtle)',
          }}
          role="listbox"
          aria-label={`Available ${labelLower}s`}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: 'var(--wd-border-subtle)' }}
          >
            <ActiveIcon size={12} className="wd-text-muted shrink-0" />
            <span className="text-xs font-medium wd-text-muted">
              Select {label}
            </span>
          </div>

          {/* Device list */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {devices.length === 0 ? (
              <div className="px-3 py-2 text-sm wd-text-muted">
                No {labelLower}s found
              </div>
            ) : (
              devices.map((device) => {
                const isSelected = selectedDeviceId === device.deviceId;
                return (
                  <button
                    key={device.deviceId}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={switching}
                    onClick={() => void handleSelect(device.deviceId)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      switching ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-[color-mix(in_srgb,var(--wd-accent)_10%,transparent)]'
                        : 'hover:bg-[color-mix(in_srgb,var(--wd-text-primary)_8%,transparent)]'
                    }`}
                  >
                    <span
                      className={`truncate ${
                        isSelected
                          ? 'text-[var(--wd-accent)]'
                          : 'wd-text-primary'
                      }`}
                    >
                      {device.label || `${label} ${device.deviceId.slice(0, 8)}`}
                    </span>

                    {isSelected && (
                      <Check
                        size={14}
                        className="ml-auto shrink-0 text-[var(--wd-accent)]"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
