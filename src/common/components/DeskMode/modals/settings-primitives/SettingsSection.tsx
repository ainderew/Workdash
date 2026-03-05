import React from 'react';

interface SettingsSectionProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function SettingsSection({
  label,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div
      className={`rounded-lg border wd-border-subtle wd-bg-panel-2 p-3 ${className ?? ''}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
        {label}
      </p>
      {description && (
        <p className="mt-0.5 text-[10px] wd-text-muted">{description}</p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default SettingsSection;
