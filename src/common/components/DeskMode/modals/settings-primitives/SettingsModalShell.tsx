import React, { useEffect } from 'react';
import { Settings, X } from 'lucide-react';

export type SettingsCategory = 'account' | 'appearance' | 'audio-video';

export interface SidebarItem {
  key: SettingsCategory;
  label: string;
  icon: React.ReactNode;
}

interface SettingsModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  categories: SidebarItem[];
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
  children: React.ReactNode;
}

export function SettingsModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  categories,
  activeCategory,
  onCategoryChange,
  children,
}: SettingsModalShellProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCat = categories.find((c) => c.key === activeCategory);

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
        {/* Compact header */}
        <div className="flex items-center justify-between px-5 py-3 border-b wd-border-subtle bg-[linear-gradient(120deg,rgba(88,101,242,0.08),transparent)]">
          <div className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border wd-border-subtle wd-bg-panel-2">
              <Settings size={14} className="wd-text-secondary" />
            </span>
            <div>
              <p className="text-sm font-semibold wd-text-primary">{title}</p>
              {subtitle && (
                <p className="text-[11px] wd-text-muted">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md wd-text-muted transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex" style={{ height: '540px' }}>
          {/* Sidebar */}
          <nav className="w-[200px] shrink-0 border-r wd-border-subtle wd-bg-panel flex flex-col">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest wd-text-muted">
                Settings
              </p>
            </div>
            <div className="px-2 space-y-0.5">
              {categories.map((cat) => {
                const isActive = cat.key === activeCategory;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => onCategoryChange(cat.key)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
                      isActive
                        ? 'wd-bg-elevated wd-text-primary shadow-sm'
                        : 'wd-text-secondary hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                        isActive
                          ? 'bg-[var(--wd-accent-soft)] text-[var(--wd-accent)]'
                          : 'wd-text-muted'
                      }`}
                    >
                      {cat.icon}
                    </span>
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Keyboard hint at bottom */}
            <div className="mt-auto px-4 pb-4">
              <p className="text-[10px] wd-text-muted">
                Press <kbd className="rounded border wd-border-subtle px-1 py-0.5 text-[9px] font-mono">Esc</kbd> to close
              </p>
            </div>
          </nav>

          {/* Content panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Content header */}
            {activeCat && (
              <div className="shrink-0 px-6 pt-5 pb-3 border-b wd-border-subtle">
                <h2 className="text-base font-semibold wd-text-primary">
                  {activeCat.label}
                </h2>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
