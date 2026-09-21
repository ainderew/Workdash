import React from "react";
import type { AdminUserDetail } from "../_types";
import { formatRelative } from "../format";

/**
 * Where and when this account has been posting. Message *content* is
 * deliberately not returned by the API — the admin console answers "is this
 * account active", not "what did they say".
 */
export function UserRecentMessages({
  messages,
}: {
  messages: AdminUserDetail["recentMessages"];
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide wd-text-muted mb-3">
        Recent activity
      </h3>

      {messages.length === 0 ? (
        <p className="text-sm wd-text-muted">No messages sent.</p>
      ) : (
        <ul className="space-y-1.5">
          {messages.map((message) => (
            <li
              key={message.id}
              className="flex items-baseline gap-2 text-sm min-w-0"
            >
              <span className="wd-text-secondary truncate">
                {message.workspaceName
                  ? `${message.workspaceName} / ${message.roomName}`
                  : message.roomName}
              </span>
              <span className="ml-auto text-[11px] wd-text-muted whitespace-nowrap">
                {formatRelative(message.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
