import React from "react";
import type { LucideIcon } from "lucide-react";

interface AdminGateMessageProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

/** Full-page state for the pre-dashboard checks: loading, signed out, denied. */
export function AdminGateMessage({
  icon: Icon,
  title,
  description,
  action,
}: AdminGateMessageProps) {
  return (
    <div className="min-h-[100dvh] wd-bg-app wd-text-primary flex items-center justify-center px-6">
      <div className="wd-card p-8 max-w-md w-full text-center">
        {Icon && (
          <Icon
            size={28}
            aria-hidden
            className="mx-auto mb-4 wd-text-muted"
          />
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && (
          <p className="text-sm wd-text-muted mt-2 leading-relaxed">
            {description}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="wd-btn-primary mt-6"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
