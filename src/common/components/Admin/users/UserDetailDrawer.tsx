import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminResource } from "../useAdminApi";
import type { AdminUserDetail } from "../_types";
import { displayName, formatDateTime, formatRelative } from "../format";
import { RoleBadge } from "./UserBadges";
import { UserAccountFacts } from "./UserAccountFacts";
import { UserWorkspaceList } from "./UserWorkspaceList";
import { UserRecentMessages } from "./UserRecentMessages";

interface UserDetailDrawerProps {
  jwt: string;
  userId: number;
  fallbackName: string;
  onClose: () => void;
}

export function UserDetailDrawer({
  jwt,
  userId,
  fallbackName,
  onClose,
}: UserDetailDrawerProps) {
  const { data, error, isLoading } = useAdminResource<AdminUserDetail>(
    `/users/${userId}`,
    jwt,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const user = data?.user;
  const name = user ? displayName(user) : fallbackName;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 wd-bg-overlay"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Account details for ${name}`}
        className="relative w-full max-w-lg h-full wd-bg-panel border-l wd-border-subtle overflow-y-auto"
      >
        <header className="sticky top-0 wd-bg-panel border-b wd-border-subtle px-6 py-4 flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold truncate">{name}</h2>
            <p className="text-xs wd-text-muted truncate">
              {user?.email ?? fallbackName}
            </p>
            {user && (
              <div className="flex items-center gap-2 mt-1.5">
                <RoleBadge role={user.role} />
                <span className="text-[11px] wd-text-muted">
                  #{user.id} · joined {formatDateTime(user.createdAt)}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account details"
            className="wd-btn-ghost p-1.5 shrink-0"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="px-6 py-5 space-y-6">
          {isLoading && (
            <p className="text-sm wd-text-muted">Loading account…</p>
          )}

          {error && (
            <p className="text-sm" role="alert">
              <span className="wd-text-primary font-medium">
                Could not load this account.
              </span>{" "}
              <span className="wd-text-muted">{error.message}</span>
            </p>
          )}

          {data && user && (
            <>
              {user.customStatus?.text && (
                <p className="text-sm wd-text-secondary">
                  {user.customStatus.emoji} {user.customStatus.text}
                </p>
              )}
              {user.bio && (
                <p className="text-sm wd-text-muted leading-relaxed">
                  {user.bio}
                </p>
              )}

              <UserAccountFacts
                user={user}
                integrations={data.integrations}
                lastSeen={formatRelative(
                  user.presence?.lastSeenAt ?? user.lastLoginAt,
                )}
              />
              <UserWorkspaceList workspaces={data.workspaces} />
              <UserRecentMessages messages={data.recentMessages} />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
