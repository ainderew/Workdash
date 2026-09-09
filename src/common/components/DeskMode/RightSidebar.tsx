import React from "react";

type RightSidebarTab = "members";

interface RightSidebarProps {
  memberCount: number;
  children: React.ReactNode;
}

function RightSidebar({ memberCount, children }: RightSidebarProps) {
  return (
    <aside className="relative ml-auto flex w-full md:w-[280px] h-full shrink-0 flex-col overflow-hidden md:border-l border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)]">
      <div className="flex h-10 shrink-0 items-center border-b border-[var(--wd-border-subtle)] px-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider wd-text-muted">
          Members
        </h3>
        <span className="ml-auto rounded bg-[var(--wd-surface-elevated)] px-1 py-0.5 text-[0.55rem] font-semibold leading-none wd-text-muted">
          {memberCount}
        </span>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}

export default RightSidebar;
export type { RightSidebarTab };
