import React from "react";
import type { LucideIcon } from "lucide-react";

export interface AdminTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AdminTabBarProps {
  tabs: AdminTab[];
  activeTab: string;
  onSelect: (id: string) => void;
}

export function AdminTabBar({ tabs, activeTab, onSelect }: AdminTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Admin sections"
      className="mx-auto max-w-[1400px] px-6 flex gap-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "wd-text-primary"
                : "wd-text-muted border-transparent hover:wd-text-secondary"
            }`}
            style={
              isActive ? { borderBottomColor: "var(--wd-accent)" } : undefined
            }
          >
            <Icon size={15} aria-hidden />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
