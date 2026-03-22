import React, { useState, useCallback } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelect: (deviceId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isInCall?: boolean;
  label?: string;
}

function DeviceSelector({
  devices,
  selectedDeviceId,
  onSelect,
  placeholder = 'No devices found',
  disabled = false,
  isInCall = false,
  label,
}: DeviceSelectorProps) {
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const deviceId = e.target.value;
      if (isInCall) {
        setPendingDeviceId(deviceId);
      } else {
        onSelect(deviceId);
      }
    },
    [isInCall, onSelect],
  );

  const confirmSwitch = useCallback(() => {
    if (pendingDeviceId) {
      onSelect(pendingDeviceId);
      setPendingDeviceId(null);
    }
  }, [pendingDeviceId, onSelect]);

  const cancelSwitch = useCallback(() => {
    setPendingDeviceId(null);
  }, []);

  const isEmpty = devices.length === 0;

  return (
    <div>
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-widest wd-text-muted mb-1.5">
          {label}
        </p>
      )}
      <div className="relative">
        <select
          value={pendingDeviceId ?? selectedDeviceId}
          onChange={handleChange}
          disabled={disabled || isEmpty}
          className="h-9 w-full appearance-none rounded-lg border wd-border-subtle bg-[var(--wd-surface-elevated)] px-3 pr-8 text-xs wd-text-primary outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEmpty ? (
            <option value="">{placeholder}</option>
          ) : (
            devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Device ${device.deviceId.slice(0, 8)}`}
              </option>
            ))
          )}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
        />
      </div>

      {pendingDeviceId && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--wd-warning)] bg-[var(--wd-warning)]/10 p-2.5">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0 text-[var(--wd-warning)]"
          />
          <div className="flex-1">
            <p className="text-xs wd-text-primary">
              You&apos;re in an active call. Switching devices may briefly
              interrupt audio/video.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={confirmSwitch}
                className="rounded-md bg-[var(--wd-warning)] px-3 py-1 text-xs font-medium text-[var(--wd-surface-base)] transition-opacity hover:opacity-90"
              >
                Switch
              </button>
              <button
                onClick={cancelSwitch}
                className="rounded-md border wd-border-subtle bg-[var(--wd-surface-elevated)] px-3 py-1 text-xs font-medium wd-text-primary transition-opacity hover:opacity-80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceSelector;
