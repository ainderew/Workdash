import React from 'react';
import { Check } from 'lucide-react';
import { THEME_OPTIONS } from '@/common/theme/themeRegistry';
import { useThemeSettings } from '../hooks/useThemeSettings';
import { SettingsSection } from '../settings-primitives';

interface AppearancePanelProps {
  isOpen: boolean;
}

export function AppearancePanel({ isOpen }: AppearancePanelProps) {
  const { theme, isSyncing, syncError, handleThemeSelect } =
    useThemeSettings(isOpen);

  return (
    <div className="space-y-5">
      <SettingsSection
        label="Theme"
        description="Choose a color scheme for the app. Changes apply instantly."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleThemeSelect(option.id)}
                aria-label={`Select ${option.label} theme`}
                className={`group relative flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-[var(--wd-accent)] bg-[var(--wd-accent-soft)] shadow-sm'
                    : 'wd-border-subtle hover:bg-[var(--wd-surface-elevated)] hover:border-[var(--wd-border-strong)]'
                }`}
              >
                {/* Swatch */}
                <span
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `rgb(${option.swatch.base})`,
                    borderColor: `rgb(${option.swatch.accent})`,
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-[8px] rounded-full"
                    style={{
                      backgroundColor: `rgb(${option.swatch.surface})`,
                    }}
                  />
                  {isSelected && (
                    <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wd-accent)] text-white shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </span>

                {/* Label + description */}
                <div className="text-center">
                  <span
                    className={`block text-xs font-semibold ${
                      isSelected ? 'wd-text-primary' : 'wd-text-secondary'
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="block text-[10px] wd-text-muted mt-0.5">
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sync status */}
        {isSyncing && (
          <div className="mt-3 flex items-center gap-2 text-xs wd-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--wd-accent)] animate-pulse" />
            Saving theme preference...
          </div>
        )}
        {syncError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--wd-warning)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--wd-warning)]" />
            Theme saved locally. Cloud sync failed: {syncError}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
