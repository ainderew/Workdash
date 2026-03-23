import React from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  badge,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-b border-[var(--wd-border-subtle)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-[var(--wd-surface-elevated)]"
      >
        <ChevronRight
          size={14}
          className={`shrink-0 wd-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <span className="text-xs font-semibold uppercase tracking-wide wd-text-secondary">
          {title}
        </span>
        {!isOpen && badge ? (
          <span className="ml-auto text-xs wd-text-muted truncate">
            {badge}
          </span>
        ) : null}
      </button>
      <div
        className={`overflow-hidden transition-[max-height] duration-200 ease-out ${
          isOpen ? "max-h-[600px]" : "max-h-0"
        }`}
      >
        <div className="px-3 pb-2">{children}</div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
