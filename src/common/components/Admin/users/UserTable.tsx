import React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { AdminUserSort, AdminUserSummary } from "../_types";
import { formatCount, formatDate, formatRelative } from "../format";
import { UserIdentityCell } from "./UserIdentityCell";
import { RoleBadge, StatusDot } from "./UserBadges";

interface UserTableProps {
  users: AdminUserSummary[];
  sort: AdminUserSort;
  direction: "asc" | "desc";
  isLoading: boolean;
  onSort: (sort: AdminUserSort, direction: "asc" | "desc") => void;
  onSelect: (user: AdminUserSummary) => void;
}

const COLUMNS: Array<{ id: AdminUserSort | null; label: string; align?: string }> =
  [
    { id: "name", label: "User" },
    { id: null, label: "Role" },
    { id: null, label: "Workspaces", align: "text-right" },
    { id: null, label: "Messages", align: "text-right" },
    { id: "lastLoginAt", label: "Last seen" },
    { id: "createdAt", label: "Joined" },
  ];

export function UserTable({
  users,
  sort,
  direction,
  isLoading,
  onSort,
  onSelect,
}: UserTableProps) {
  const toggleSort = (column: AdminUserSort) =>
    onSort(column, sort === column && direction === "desc" ? "asc" : "desc");

  return (
    <div className="wd-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Platform users, sorted by {sort}, {direction}ending
          </caption>
          <thead>
            <tr className="border-b wd-border-subtle">
              {COLUMNS.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  aria-sort={
                    column.id && column.id === sort
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide wd-text-muted ${column.align ?? "text-left"}`}
                >
                  {column.id ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.id!)}
                      className="inline-flex items-center gap-1 hover:wd-text-primary transition-colors uppercase"
                    >
                      {column.label}
                      {column.id === sort &&
                        (direction === "asc" ? (
                          <ArrowUp size={12} aria-hidden />
                        ) : (
                          <ArrowDown size={12} aria-hidden />
                        ))}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b wd-border-subtle last:border-0 hover:wd-bg-panel-2 transition-colors"
              >
                <td className="px-4 py-3">
                  <UserIdentityCell user={user} onSelect={onSelect} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RoleBadge role={user.role} />
                    <StatusDot user={user} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums wd-text-secondary">
                  {formatCount(user.workspaceCount)}
                  {user.ownedWorkspaceCount > 0 && (
                    <span className="wd-text-muted text-xs ml-1">
                      ({user.ownedWorkspaceCount} owned)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums wd-text-secondary">
                  {formatCount(user.messageCount)}
                </td>
                <td className="px-4 py-3 wd-text-muted whitespace-nowrap">
                  {formatRelative(
                    user.presence?.lastSeenAt ?? user.lastLoginAt,
                  )}
                </td>
                <td className="px-4 py-3 wd-text-muted whitespace-nowrap">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <p className="px-4 py-10 text-center text-sm wd-text-muted">
          {isLoading ? "Loading users…" : "No users match these filters."}
        </p>
      )}
    </div>
  );
}
