import React from "react";
import type { AdminUserDetail } from "../_types";
import { formatCount, formatDate } from "../format";

interface UserAccountFactsProps {
  user: AdminUserDetail["user"];
  integrations: AdminUserDetail["integrations"];
  lastSeen: string;
}

export function UserAccountFacts({
  user,
  integrations,
  lastSeen,
}: UserAccountFactsProps) {
  const facts: Array<[string, string]> = [
    ["Last seen", lastSeen],
    ["Email verified", user.emailVerified ? "Yes" : "No"],
    [
      "Sign-in method",
      user.authMethods.length > 0 ? user.authMethods.join(", ") : "Not recorded",
    ],
    ["Level", formatCount(user.level)],
    ["Workspaces", formatCount(user.counts.workspaces)],
    ["Owns", formatCount(user.counts.workspacesOwned)],
    ["Messages", formatCount(user.counts.messages)],
    ["Reactions", formatCount(user.counts.reactions)],
    ["Achievements", formatCount(user.counts.achievements)],
    ["Push devices", formatCount(user.counts.pushSubscriptions)],
    [
      "Steam",
      integrations.steam
        ? `${integrations.steam.personaName ?? integrations.steam.steamId64} · linked ${formatDate(integrations.steam.linkedAt)}`
        : "Not linked",
    ],
    [
      "Betrayal.io",
      integrations.betrayal
        ? `${integrations.betrayal.friendCode} · linked ${formatDate(integrations.betrayal.linkedAt)}`
        : "Not linked",
    ],
  ];

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide wd-text-muted mb-3">
        Account
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] wd-text-muted">{label}</dt>
            <dd className="wd-text-secondary truncate" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
