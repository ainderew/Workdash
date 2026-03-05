import React from 'react';

interface SettingsSectionProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ label, description, children }: SettingsSectionProps) {
  return (
    <div className="rounded-xl border wd-border-subtle wd-bg-panel-2 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider wd-text-muted">
          {label}
        </p>
      </div>
      {description && (
        <p className="mt-1 text-xs wd-text-muted">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}
