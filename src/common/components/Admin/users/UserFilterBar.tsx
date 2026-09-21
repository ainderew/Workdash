import React from "react";
import { Search } from "lucide-react";
import type {
  AdminUserFilters,
  AdminUserRole,
  AdminUserStatus,
} from "../_types";
import { formatCount } from "../format";

interface UserFilterBarProps {
  filters: AdminUserFilters;
  total: number | null;
  onChange: (patch: Partial<AdminUserFilters>) => void;
}

const ROLES: AdminUserRole[] = ["ADMIN", "MEMBER", "GUEST"];
const STATUSES: AdminUserStatus[] = ["ONLINE", "OFFLINE", "FOCUS"];

export function UserFilterBar({
  filters,
  total,
  onChange,
}: UserFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[240px]">
        <Search
          size={15}
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 wd-text-muted pointer-events-none"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search by name, nickname, email or ID"
          aria-label="Search users"
          className="wd-input pl-9"
        />
      </div>

      <label className="sr-only" htmlFor="admin-role-filter">
        Filter by role
      </label>
      <select
        id="admin-role-filter"
        value={filters.role}
        onChange={(event) =>
          onChange({ role: event.target.value as AdminUserRole | "" })
        }
        className="wd-input w-auto min-w-[130px]"
      >
        <option value="">All roles</option>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="admin-status-filter">
        Filter by status
      </label>
      <select
        id="admin-status-filter"
        value={filters.status}
        onChange={(event) =>
          onChange({ status: event.target.value as AdminUserStatus | "" })
        }
        className="wd-input w-auto min-w-[140px]"
      >
        <option value="">All statuses</option>
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      {total !== null && (
        <span className="text-sm wd-text-muted tabular-nums" aria-live="polite">
          {formatCount(total)} {total === 1 ? "user" : "users"}
        </span>
      )}
    </div>
  );
}
