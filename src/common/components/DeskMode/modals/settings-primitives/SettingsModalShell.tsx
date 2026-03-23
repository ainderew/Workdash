import React, { useEffect, useMemo, useState } from 'react';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Search, X } from 'lucide-react';

export type SettingsCategory = 'general' | 'account' | 'appearance' | 'audio-video' | 'connections' | 'achievements';

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

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

const MODAL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.32, ease: EASE_OUT_QUART },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
  },
};

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
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[290] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="wd-settings-modal relative w-full max-w-4xl overflow-hidden rounded-2xl border wd-border-strong"
            style={{ backgroundColor: 'var(--wd-surface-panel)' }}
            variants={MODAL_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex" style={{ height: 'min(80vh, 720px)' }}>
              {/* ── Sidebar ── */}
              <nav
                className="wd-settings-sidebar relative w-[224px] shrink-0 flex flex-col overflow-hidden"
                style={{ backgroundColor: 'var(--wd-surface-panel-2)' }}
              >
                {/* Ambient glow behind sidebar — decorative depth */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  aria-hidden="true"
                  style={{
                    background: 'radial-gradient(ellipse 120% 50% at 100% 30%, var(--wd-accent-soft), transparent 70%)',
                  }}
                />

                {/* Title block */}
                <div className="relative px-4 pt-5 pb-3">
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em] wd-text-primary">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-0.5 text-[11px] wd-text-muted leading-snug">
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Search */}
                <div className="relative px-3 pb-2">
                  <div className="relative group">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted pointer-events-none transition-colors duration-150 group-focus-within:text-[var(--wd-accent)]"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search settings..."
                      className="wd-settings-search h-[30px] w-full rounded-lg border wd-border-subtle pr-2.5 text-[11px] wd-text-primary placeholder:wd-text-muted outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_2px_var(--wd-accent-soft)]"
                      style={{
                        backgroundColor: 'var(--wd-surface-elevated)',
                        paddingLeft: '1.75rem',
                      }}
                    />
                  </div>
                </div>

                {/* Separator */}
                <div className="mx-3 h-px" style={{ backgroundColor: 'var(--wd-border-subtle)' }} />

                {/* Category list */}
                <div className="relative flex-1 overflow-y-auto px-2.5 pt-2 pb-1 no-scrollbar">
                  <div className="space-y-0.5">
                    {filteredCategories.map((category, i) => {
                      const isActive = activeCategory === category.id;
                      return (
                        <motion.button
                          key={category.id}
                          type="button"
                          onClick={() => onCategoryChange(category.id)}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            transition: {
                              duration: 0.24,
                              delay: i * 0.03,
                              ease: EASE_OUT_QUART,
                            },
                          }}
                          className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium transition-colors duration-150 ${
                            isActive
                              ? 'wd-text-primary'
                              : 'wd-text-muted hover:wd-text-primary'
                          }`}
                        >
                          {/* Active background — renders behind via layoutId */}
                          {isActive && (
                            <motion.div
                              layoutId="wd-settings-active-bg"
                              className="absolute inset-0 rounded-lg"
                              style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                              transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 32,
                              }}
                            />
                          )}

                          {/* Active accent bar */}
                          {isActive && (
                            <motion.div
                              layoutId="wd-settings-accent-bar"
                              className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full"
                              style={{ backgroundColor: 'var(--wd-accent)' }}
                              transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 32,
                              }}
                            />
                          )}

                          <span
                            className={`relative z-[1] inline-flex h-[26px] w-[26px] items-center justify-center rounded-md transition-all duration-150 ${
                              isActive
                                ? 'text-[var(--wd-accent)]'
                                : 'wd-text-muted group-hover:wd-text-secondary'
                            }`}
                            style={isActive ? { backgroundColor: 'var(--wd-accent-soft)' } : undefined}
                          >
                            {category.icon}
                          </span>
                          <span className="relative z-[1]">{category.label}</span>
                        </motion.button>
                      );
                    })}
                    {filteredCategories.length === 0 && (
                      <p className="px-2.5 py-4 text-[11px] wd-text-muted text-center">
                        No matching settings
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Fixed bottom section ── */}
                <div
                  className="relative shrink-0 px-2.5 pb-3 pt-2"
                  style={{
                    boxShadow: '0 -8px 16px 4px var(--wd-surface-panel-2)',
                  }}
                >
                  {/* Logout button */}
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium text-[var(--wd-danger)] transition-all duration-150 hover:bg-[var(--wd-danger-soft)]"
                  >
                    <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[var(--wd-danger-soft)] text-[var(--wd-danger)] transition-all duration-150 group-hover:bg-[var(--wd-danger)] group-hover:text-white">
                      <LogOut size={15} />
                    </span>
                    <span>Log Out</span>
                  </button>

                  {/* Separator */}
                  <div
                    className="mx-1 my-1.5 h-px"
                    style={{ backgroundColor: 'var(--wd-border-subtle)' }}
                  />

                  {/* ESC hint */}
                  <div className="px-2.5 flex items-center gap-2">
                    <kbd
                      className="inline-flex h-5 items-center justify-center rounded px-1.5 text-[10px] font-medium wd-text-muted"
                      style={{
                        backgroundColor: 'var(--wd-surface-elevated)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      }}
                    >
                      ESC
                    </kbd>
                    <span className="text-[10px] wd-text-muted">to close</span>
                  </div>
                </div>

                {/* Right border — gradient that fades at edges */}
                <div
                  className="pointer-events-none absolute right-0 top-0 bottom-0 w-px"
                  style={{
                    background: 'linear-gradient(to bottom, transparent 5%, var(--wd-border-subtle) 20%, var(--wd-border-subtle) 80%, transparent 95%)',
                  }}
                />
              </nav>

              {/* ── Content Area ── */}
              <div className="relative flex-1 min-w-0">
                {/* Close button — fixed in top-right */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close settings modal"
                  className="absolute top-3.5 right-3.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full wd-text-muted transition-all duration-150 hover:wd-text-primary active:scale-95"
                  style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                >
                  <X size={14} />
                </button>

                {/* Scrollable content */}
                <div className="h-full overflow-y-auto no-scrollbar">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.24, ease: EASE_OUT_QUART },
                    }}
                    className="px-6 py-5 pr-14"
                  >
                    {children}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SettingsModalShell;
