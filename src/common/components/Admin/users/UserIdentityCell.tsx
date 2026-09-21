import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AdminUserSummary } from "../_types";
import { displayName } from "../format";

interface UserIdentityCellProps {
  user: AdminUserSummary;
  onSelect: (user: AdminUserSummary) => void;
}

/** Avatar + name + email, as the button that opens the account drawer. */
export function UserIdentityCell({ user, onSelect }: UserIdentityCellProps) {
  const name = displayName(user);

  return (
    <button
      type="button"
      onClick={() => onSelect(user)}
      className="flex items-center gap-3 text-left group"
    >
      <Avatar className="h-8 w-8 shrink-0">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
        <AvatarFallback className="text-xs">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block font-medium truncate group-hover:underline">
          {name}
        </span>
        <span className="block text-xs wd-text-muted truncate">
          {user.email}
        </span>
      </span>
    </button>
  );
}
