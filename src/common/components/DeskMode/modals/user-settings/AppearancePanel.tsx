import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { SettingsSection } from '../settings-primitives';
import { useThemeSettings } from '../hooks/useThemeSettings';
import { THEME_OPTIONS } from '@/common/theme/themeRegistry';

function AppearancePanel() {
  const { theme, isSyncing, syncError, handleThemeSelect, clearSyncError } =
    useThemeSettings();

  useEffect(() => {
    clearSyncError();
  }, [clearSyncError]);

  return (
    <div className="space-y-4">
      <SettingsSection label="Theme">
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleThemeSelect(option.id)}
                title={option.description}
                aria-label={`Select ${option.label} theme`}
                className="group rounded-md border border-transparent p-1.5 transition-colors hover:bg-[var(--wd-surface-elevated)]"
              >
                <span className="block text-[11px] font-semibold wd-text-secondary">
                  {option.label}
                </span>
                <span
                  className={`relative mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected
                      ? 'outline outline-2 outline-offset-2 outline-[var(--wd-accent)]'
                      : 'border-[var(--wd-border-subtle)]'
                  }`}
                  style={{
                    backgroundColor: `rgb(${option.swatch.base})`,
                    borderColor: `rgb(${option.swatch.accent})`,
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-[7px] rounded-full"
                    style={{
                      backgroundColor: `rgb(${option.swatch.surface})`,
                    }}
                  />
                  {isSelected && (
                    <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--wd-accent)] text-white">
                      <Check size={11} />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {isSyncing && (
          <p className="mt-2 text-xs wd-text-muted">
            Saving theme preference...
          </p>
        )}
        {syncError && (
          <p className="mt-2 text-xs wd-text-warning">
            Theme saved locally. Cloud sync failed: {syncError}
          </p>
        )}
      </SettingsSection>
    </div>
  );
}

export default AppearancePanel;
