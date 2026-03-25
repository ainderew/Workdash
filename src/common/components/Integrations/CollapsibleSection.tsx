import React from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: "success" | "danger" | "warning" | "muted";
  children: React.ReactNode;
}

const BADGE_STYLES: Record<string, string> = {
  success:
    "bg-[rgb(var(--wd-success-rgb)/0.12)] text-[var(--wd-success)]",
  danger:
    "bg-[rgb(var(--wd-danger-rgb)/0.12)] text-[var(--wd-danger)]",
  warning:
    "bg-[rgb(var(--wd-warning-rgb)/0.12)] text-[var(--wd-warning)]",
  muted:
    "bg-[var(--wd-surface-elevated)] wd-text-muted",
};

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  badge,
  badgeColor = "muted",
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="group/section">
      {/* Header — music-bot style: compact, uppercase, clean divider */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 border-b border-[var(--wd-border-subtle)] px-3 py-2 text-left transition-colors hover:bg-[var(--wd-surface-elevated)]"
      >
        <ChevronRight
          size={10}
          strokeWidth={2.5}
          className={`shrink-0 wd-text-muted transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        {icon && (
          <span className="shrink-0 text-[0.6rem] leading-none">{icon}</span>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-widest wd-text-muted">
          {title}
        </span>
        {badge && (
          <span
            className={`ml-auto rounded-full px-1.5 py-px text-[9px] font-bold leading-none tabular-nums ${BADGE_STYLES[badgeColor]}`}
          >
            {badge}
          </span>
        )}
      </button>

      {/* Collapsible body — matched to NowPlayingBar queue panel transition */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="animate-[wd-pz-section-open_200ms_ease] px-3 pb-2 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
