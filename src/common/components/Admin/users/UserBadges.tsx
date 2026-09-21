import React from "react";
import type { AdminUserRole, AdminUserSummary } from "../_types";

const ROLE_COLORS: Record<AdminUserRole, string> = {
  ADMIN: "var(--wd-accent)",
  MEMBER: "var(--wd-text-muted)",
  GUEST: "var(--wd-info)",
};

export function RoleBadge({ role }: { role: AdminUserRole }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        color: ROLE_COLORS[role],
        backgroundColor: `color-mix(in srgb, ${ROLE_COLORS[role]} 14%, transparent)`,
      }}
    >
      {role}
    </span>
  );
}

/**
 * Live presence, not the User.status column — presence is what the socket
 * layer maintains, so it is the one that reflects reality.
 */
export function StatusDot({ user }: { user: AdminUserSummary }) {
  const isOnline = user.presence?.isOnline ?? false;
  const label = isOnline ? "Online" : "Offline";

  return (
    <span className="inline-flex items-center gap-1 text-[11px] wd-text-muted">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: isOnline
            ? "var(--wd-success)"
            : "var(--wd-text-muted)",
        }}
      />
      <span className="sr-only">{label}</span>
      {isOnline && "online"}
    </span>
  );
}
