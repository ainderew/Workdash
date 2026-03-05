import React, { useEffect, useMemo, useState } from 'react';
import { Search, Settings, X } from 'lucide-react';

export type SettingsCategory = 'account' | 'appearance' | 'audio-video';

export interface SidebarItem {
  id: SettingsCategory;
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

function SettingsModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  categories,
  activeCategory,
  onCategoryChange,
  children,
}: SettingsModalShellProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(
    () =>
      searchQuery.trim()
        ? categories.filter((c) =>
            c.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
          )
        : categories,
    [categories, searchQuery],
  );

  useEffect(() => {
    if (isOpen) setSearchQuery('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="relative h-16 border-b wd-border-subtle bg-[linear-gradient(120deg,rgba(88,101,242,0.2),rgba(15,17,21,0.96))]">
          <div className="absolute inset-0 flex items-center justify-between px-5">
            <div className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border wd-border-subtle wd-bg-panel-2">
                <Settings size={15} className="wd-text-secondary" />
              </span>
              <div>
                <p className="text-sm font-semibold wd-text-primary">{title}</p>
                {subtitle && (
                  <p className="text-xs wd-text-muted">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings modal"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body: Sidebar + Content */}
        <div className="flex" style={{ height: 'min(75vh, 680px)' }}>
          {/* Sidebar */}
          <nav className="w-[220px] shrink-0 border-r wd-border-subtle wd-bg-panel-2 flex flex-col">
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="h-8 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2.5 text-xs wd-text-primary placeholder:wd-text-muted outline-none focus:border-[var(--wd-border-strong)] transition-colors"
                />
              </div>
            </div>

            <div className="mx-3 border-t wd-border-subtle" />

            {/* Category list */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider wd-text-muted">
                Settings
              </p>
              <div className="space-y-0.5">
                {filteredCategories.map((category) => {
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => onCategoryChange(category.id)}
                      className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-all ${
                        isActive
                          ? 'wd-bg-elevated wd-text-primary font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.15)]'
                          : 'wd-text-secondary hover:wd-bg-elevated hover:wd-text-primary'
                      }`}
                    >
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                          isActive
                            ? 'bg-[rgba(88,101,242,0.2)]'
                            : 'bg-[var(--wd-surface-elevated)] group-hover:bg-[rgba(88,101,242,0.1)]'
                        }`}
                      >
                        {category.icon}
                      </span>
                      {category.label}
                    </button>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <p className="px-2.5 py-3 text-xs wd-text-muted text-center">
                    No matching settings
                  </p>
                )}
              </div>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModalShell;
