'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Expand,
  Minus,
  PictureInPicture2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export interface DisplayModeSplitButtonProps {
  isCollapsed?: boolean;
  onPictureInPicture?: () => void;
  onToggleFullscreen?: () => void;
  onToggleCollapse?: () => void;
  size?: 'sm' | 'md';
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  action: () => void;
}

const iconSizes = { sm: 13, md: 15 } as const;
const chevronSizes = { sm: 8, md: 10 } as const;
const heightClasses = { sm: 'h-7', md: 'h-8' } as const;

export default function DisplayModeSplitButton({
  isCollapsed = false,
  onPictureInPicture,
  onToggleFullscreen,
  onToggleCollapse,
  size = 'md',
}: DisplayModeSplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mainIcon = iconSizes[size];
  const chevron = chevronSizes[size];
  const h = heightClasses[size];

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  // Determine primary action + menu items based on collapsed state
  let PrimaryIcon: LucideIcon;
  let primaryLabel: string;
  let primaryAction: (() => void) | undefined;
  const menuItems: MenuItem[] = [];

  if (isCollapsed) {
    PrimaryIcon = ChevronUp;
    primaryLabel = 'Expand call view';
    primaryAction = onToggleCollapse;
    if (onPictureInPicture) {
      menuItems.push({ icon: PictureInPicture2, label: 'Pop out', action: onPictureInPicture });
    }
    if (onToggleFullscreen) {
      menuItems.push({ icon: Expand, label: 'Enter fullscreen', action: onToggleFullscreen });
    }
  } else {
    PrimaryIcon = PictureInPicture2;
    primaryLabel = 'Pop out';
    primaryAction = onPictureInPicture;
    if (onToggleFullscreen) {
      menuItems.push({ icon: Expand, label: 'Enter fullscreen', action: onToggleFullscreen });
    }
    if (onToggleCollapse) {
      menuItems.push({ icon: Minus, label: 'Minimize', action: onToggleCollapse });
    }
  }

  const hasMenu = menuItems.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <div
        role="group"
        aria-label="Display mode controls"
        className={`inline-flex items-center ${h} rounded-full border wd-border-subtle overflow-hidden transition-colors`}
      >
        {/* Primary action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={primaryAction}
              disabled={!primaryAction}
              className={`inline-flex items-center justify-center ${h} px-2 transition-colors ${primaryAction ? 'wd-text-secondary hover:wd-text-primary cursor-pointer hover:bg-[color-mix(in_srgb,var(--wd-text-primary)_10%,transparent)]' : 'wd-text-muted opacity-40 cursor-not-allowed'}`}
            >
              <PrimaryIcon size={mainIcon} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>{primaryLabel}</TooltipContent>
        </Tooltip>

        {/* Divider + chevron */}
        {hasMenu && (
          <>
            <div className="w-px h-4 bg-[var(--wd-border-subtle)]" />
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className={`inline-flex items-center justify-center ${h} px-1.5 wd-text-secondary opacity-70 hover:opacity-100 cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--wd-text-primary)_10%,transparent)] ${isOpen ? 'bg-[color-mix(in_srgb,var(--wd-text-primary)_10%,transparent)]' : ''}`}
              aria-label="More display options"
              aria-haspopup="menu"
              aria-expanded={isOpen}
            >
              <ChevronDown
                size={chevron}
                className={`transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </>
        )}
      </div>

      {/* Popover menu — opens upward */}
      {isOpen && (
        <div
          className="wd-anim-popover-up absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[160px] rounded-lg border shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--wd-surface-overlay)',
            borderColor: 'var(--wd-border-subtle)',
          }}
          role="menu"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer transition-colors wd-text-primary hover:bg-[color-mix(in_srgb,var(--wd-text-primary)_8%,transparent)]"
              >
                <Icon size={14} className="shrink-0 wd-text-muted" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
