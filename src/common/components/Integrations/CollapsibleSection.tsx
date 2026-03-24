import React, { useRef } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="group/section">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--wd-surface-elevated)]"
      >
        <ChevronRight
          size={12}
          className={`shrink-0 wd-text-muted transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        {icon && (
          <span className="shrink-0 text-xs">{icon}</span>
        )}
        <span className="text-[0.68rem] font-semibold uppercase tracking-widest wd-text-muted">
          {title}
        </span>
        {badge && (
          <span
            className={`ml-auto rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold leading-none ${BADGE_STYLES[badgeColor]}`}
          >
            {badge}
          </span>
        )}
      </button>
      <div
        ref={contentRef}
        className={`overflow-hidden transition-[max-height,opacity] duration-250 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="animate-[wd-pz-section-open_200ms_ease] px-3 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
