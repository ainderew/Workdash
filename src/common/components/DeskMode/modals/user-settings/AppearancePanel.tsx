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
        <div className="grid grid-cols-2 gap-2.5">
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleThemeSelect(option.id)}
                title={option.description}
                aria-label={`Select ${option.label} theme`}
                className={`group relative rounded-xl border p-2.5 text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-[var(--wd-accent)] shadow-[0_0_0_1px_var(--wd-accent)]'
                    : 'wd-border-subtle hover:border-[var(--wd-border-strong)]'
                }`}
                style={{ backgroundColor: 'var(--wd-surface-panel)' }}
              >
                {/* Mini UI preview */}
                <div
                  className="relative h-16 rounded-lg overflow-hidden mb-2"
                  style={{ backgroundColor: `rgb(${option.swatch.base})` }}
                >
                  {/* Accent top bar */}
                  <div
                    className="absolute top-0 inset-x-0 h-[5px]"
                    style={{ backgroundColor: `rgb(${option.swatch.accent})` }}
                  />
                  {/* Surface sidebar */}
                  <div
                    className="absolute left-0 top-[5px] bottom-0 w-[22%]"
                    style={{ backgroundColor: `rgb(${option.swatch.surface})` }}
                  />
                  {/* Fake content lines */}
                  <div className="absolute left-[28%] top-[14px] right-[10%] space-y-[5px]">
                    <div
                      className="h-[3px] w-[60%] rounded-full"
                      style={{
                        backgroundColor: `rgb(${option.swatch.accent})`,
                        opacity: 0.4,
                      }}
                    />
                    <div
                      className="h-[3px] w-[80%] rounded-full"
                      style={{
                        backgroundColor: `rgb(${option.swatch.accent})`,
                        opacity: 0.15,
                      }}
                    />
                    <div
                      className="h-[3px] w-[45%] rounded-full"
                      style={{
                        backgroundColor: `rgb(${option.swatch.accent})`,
                        opacity: 0.15,
                      }}
                    />
                  </div>
                  {/* Sidebar nav dots */}
                  <div className="absolute left-[4%] top-[16px] space-y-[4px]">
                    <div
                      className="h-[5px] w-[5px] rounded-full"
                      style={{
                        backgroundColor: `rgb(${option.swatch.accent})`,
                        opacity: 0.7,
                      }}
                    />
                    <div
                      className="h-[5px] w-[5px] rounded-full"
                      style={{
                        backgroundColor: `rgb(${option.swatch.accent})`,
                        opacity: 0.25,
                      }}
                    />
                    <div
                      className="h-[5px] w-[5px] rounded-full"
                      style={{
                        backgroundColor: `rgb(${option.swatch.accent})`,
                        opacity: 0.25,
                      }}
                    />
                  </div>
                </div>

                {/* Label row */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="block text-[12px] font-semibold wd-text-primary truncate">
                      {option.label}
                    </span>
                    <span className="block text-[10px] wd-text-muted truncate">
                      {option.description}
                    </span>
                  </div>
                  {isSelected && (
                    <span
                      className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: 'var(--wd-accent)' }}
                    >
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
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
