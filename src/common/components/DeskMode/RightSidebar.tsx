import React from "react";
import { Users } from "lucide-react";
import { useIntegrationStore } from "@/common/store/integrationStore";
import { usePZStore } from "@/common/store/pzStore";

type RightSidebarTab = "members" | "pz";

interface RightSidebarProps {
  activeTab: RightSidebarTab;
  onTabChange: (tab: RightSidebarTab) => void;
  memberCount: number;
  children: React.ReactNode;
}

function RightSidebar({
  activeTab,
  onTabChange,
  memberCount,
  children,
}: RightSidebarProps) {
  const integrations = useIntegrationStore((s) => s.integrations);
  const hasPZ = integrations.some(
    (i) => i.type === "pz_server" && i.isActive,
  );
  const isServerOnline = usePZStore((s) => s.isServerOnline);
  const onlinePlayerCount = usePZStore((s) => s.onlinePlayers).length;

  return (
    <aside className="relative ml-auto flex w-full md:w-[280px] h-full shrink-0 flex-col overflow-hidden md:border-l border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)]">
      {/* Tab bar — only show when PZ integration exists */}
      {hasPZ ? (
        <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-[var(--wd-border-subtle)] px-2">
          <TabButton
            isActive={activeTab === "members"}
            onClick={() => onTabChange("members")}
          >
            <Users size={13} className="shrink-0" />
            <span>Members</span>
            <span className="ml-auto rounded bg-[var(--wd-surface-elevated)] px-1 py-0.5 text-[0.55rem] font-semibold leading-none wd-text-muted">
              {memberCount}
            </span>
          </TabButton>

          <TabButton
            isActive={activeTab === "pz"}
            onClick={() => onTabChange("pz")}
          >
            <span className="relative shrink-0 text-xs">
              🧟
              {isServerOnline && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--wd-success)] animate-[wd-pz-pulse_2.5s_ease-in-out_infinite]" />
              )}
            </span>
            <span>PZ</span>
            {onlinePlayerCount > 0 && (
              <span className="ml-auto rounded bg-[rgb(var(--wd-success-rgb)/0.12)] px-1 py-0.5 text-[0.55rem] font-semibold leading-none text-[var(--wd-success)]">
                {onlinePlayerCount}
              </span>
            )}
          </TabButton>
        </div>
      ) : (
        <div className="flex h-10 shrink-0 items-center border-b border-[var(--wd-border-subtle)] px-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider wd-text-muted">
            Members
          </h3>
        </div>
      )}

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}

function TabButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.68rem] font-semibold transition-all duration-150 ${
        isActive
          ? "bg-[var(--wd-surface-elevated)] wd-text-primary shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
          : "wd-text-muted hover:wd-text-secondary hover:bg-[var(--wd-surface-elevated)]/50"
      }`}
    >
      {children}
    </button>
  );
}

export default RightSidebar;
export type { RightSidebarTab };
