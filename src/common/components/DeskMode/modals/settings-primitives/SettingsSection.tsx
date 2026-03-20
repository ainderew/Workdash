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
      className={`wd-settings-section rounded-xl border wd-border-subtle p-4 transition-colors duration-150 hover:border-[var(--wd-border-strong)] ${className ?? ''}`}
      style={{ backgroundColor: 'var(--wd-surface-panel-2)' }}
    >
      <div className="flex items-baseline gap-2 mb-3">
        {/* Accent dot */}
        <span
          className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: 'var(--wd-accent)' }}
          aria-hidden="true"
        />
        <p className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted">
          {label}
        </p>
        {description && (
          <>
            <span className="wd-text-muted opacity-30" aria-hidden="true">
              /
            </span>
            <p className="text-[10px] wd-text-muted">{description}</p>
          </>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default SettingsSection;
