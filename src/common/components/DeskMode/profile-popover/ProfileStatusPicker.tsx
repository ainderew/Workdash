import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { usePresenceStore } from '@/common/store/presenceStore';
import { StatusClientService } from '@/communication/status/statusService';

const STATUS_DESCRIPTIONS: Record<string, string> = {
  focus: 'You will not receive desktop notifications',
};

function StatusIcon({ statusId, color }: { statusId: string; color: string }) {
  if (statusId === 'away') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="4.5" stroke={color} strokeWidth="1" />
        <path
          d="M5 0.5 A4.5 4.5 0 0 1 5 9.5 A2.25 2.25 0 0 0 5 0.5Z"
          fill={color}
        />
      </svg>
    );
  }
  if (statusId === 'afk') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="4" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
        <circle cx="5" cy="5" r="1.5" fill={color} />
      </svg>
    );
  }
  if (statusId === 'focus') {
    return (
      <span
        className="relative block h-2.5 w-2.5 rounded-full bg-[var(--wd-status-color)]"
        style={{ '--wd-status-color': color } as React.CSSProperties}
      >
        <span className="absolute inset-[3px] rounded-full bg-[var(--wd-surface-panel)]" />
      </span>
    );
  }
  return (
    <span
      className="block h-2.5 w-2.5 rounded-full bg-[var(--wd-status-color)]"
      style={{ '--wd-status-color': color } as React.CSSProperties}
    />
  );
}

export function ProfileStatusPicker() {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const myStatus = usePresenceStore((s) => s.myStatus);
  const definitions = usePresenceStore((s) => s.definitions);

  const selectableStatuses = Object.values(definitions)
    .filter(
      (d) =>
        (d.category === 'SYSTEM' || d.category === 'MANUAL') &&
        d.id !== 'offline' &&
        d.id !== 'afk',
    )
    .sort((a, b) => b.priority - a.priority);

  useEffect(() => {
    if (!isSubmenuOpen) return undefined;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsSubmenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSubmenuOpen(false);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmenuOpen]);

  const handleSelect = async (statusId: string) => {
    setIsSubmenuOpen(false);
    try {
      const service = StatusClientService.getInstance();
      if (statusId !== 'online' && statusId !== 'away' && statusId !== 'focus') return;
      await service.setStatus(statusId);
    } catch (err) {
      console.error('[ProfileStatusPicker] Failed to set status:', err);
    }
  };

  return (
    <div ref={containerRef} className="relative mx-4 mt-1 mb-1">
      <button
        type="button"
        onClick={() => setIsSubmenuOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/[0.06] group"
      >
        <span className="shrink-0 flex items-center justify-center w-4 h-4">
          <StatusIcon statusId={myStatus.statusId} color={myStatus.color} />
        </span>
        <span className="flex-1 text-left text-[13px] font-medium wd-text-primary">
          {myStatus.label}
        </span>
        <ChevronRight
          size={14}
          className="wd-text-muted opacity-60 group-hover:opacity-100 transition-opacity"
        />
      </button>

      {isSubmenuOpen && (
        <div className="absolute left-[calc(100%+8px)] bottom-0 z-[175] w-72 rounded-lg border border-[var(--wd-border-subtle)] wd-bg-panel backdrop-blur-xl shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.4)] py-2 px-2">
          <div className="space-y-1">
          {selectableStatuses.map((def, i) => {
            const description = STATUS_DESCRIPTIONS[def.id];
            const isActive = myStatus.statusId === def.id;

            return (
              <React.Fragment key={def.id}>
                {i === 1 && (
                  <div className="mx-2 my-1.5 border-t border-[var(--wd-border-subtle)]" />
                )}
                <button
                  type="button"
                  onClick={() => void handleSelect(def.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] wd-text-primary font-medium'
                      : 'wd-text-secondary hover:wd-text-primary hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="shrink-0 flex items-center justify-center w-4 h-4">
                    <StatusIcon statusId={def.id} color={def.color} />
                  </span>
                  <div className="flex-1 text-left min-w-0">
                    <p className="truncate">{def.label}</p>
                    {description && (
                      <p className="text-[11px] wd-text-muted mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                  {isActive && (
                    <Check
                      size={14}
                      className="wd-text-accent shrink-0"
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
