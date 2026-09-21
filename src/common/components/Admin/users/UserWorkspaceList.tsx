import React from "react";
import { Crown } from "lucide-react";
import type { AdminUserDetail } from "../_types";
import { formatCount, formatDate } from "../format";

export function UserWorkspaceList({
  workspaces,
}: {
  workspaces: AdminUserDetail["workspaces"];
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide wd-text-muted mb-3">
        Workspaces ({workspaces.length})
      </h3>

      {workspaces.length === 0 ? (
        <p className="text-sm wd-text-muted">Not a member of any workspace.</p>
      ) : (
        <ul className="space-y-2">
          {workspaces.map((workspace) => (
            <li
              key={workspace.id}
              className="wd-bg-panel-2 rounded-lg px-3 py-2.5 border wd-border-subtle"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {workspace.name}
                </span>
                {workspace.isOwner && (
                  <Crown
                    size={12}
                    aria-label="Owner"
                    style={{ color: "var(--wd-accent)" }}
                  />
                )}
                <span className="ml-auto text-[11px] wd-text-muted whitespace-nowrap">
                  {formatCount(workspace.memberCount)} members
                </span>
              </div>
              <p className="text-[11px] wd-text-muted mt-1">
                {workspace.visibility.toLowerCase()} · joined{" "}
                {formatDate(workspace.joinedAt)}
                {workspace.roles.length > 0 &&
                  ` · ${workspace.roles.map((role) => role.name).join(", ")}`}
              </p>
              {workspace.timedOutUntil && (
                <p
                  className="text-[11px] mt-1"
                  style={{ color: "var(--wd-warning)" }}
                >
                  Timed out until {formatDate(workspace.timedOutUntil)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
