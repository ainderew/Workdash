import React from "react";
import Image from "next/image";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { toWorkspaceInitials } from "@/common/utils/workspaceDisplay";

interface InviteInvalidViewProps {
  reason?: string;
  workspace?: {
    name: string;
    iconUrl: string | null;
  } | null;
}

export function InviteInvalidView({ reason, workspace }: InviteInvalidViewProps) {
  return (
    <div className="wd-invite-card-wrapper">
      <div className="wd-invite-card">
        {/* Workspace icon when available, otherwise broken link icon */}
        {workspace ? (
          <div className="w-16 h-16 rounded-[14px] wd-bg-elevated flex items-center justify-center text-xl font-bold wd-text-primary overflow-hidden shrink-0 opacity-60">
            {workspace.iconUrl ? (
              <Image
                src={workspace.iconUrl}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{toWorkspaceInitials(workspace.name)}</span>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full wd-bg-elevated flex items-center justify-center">
            <LinkIcon size={24} className="wd-text-muted" />
          </div>
        )}

        <h1 className="text-xl font-semibold wd-text-primary text-center mt-4">
          This invite is no longer valid
        </h1>

        {workspace && (
          <p className="text-sm wd-text-secondary text-center mt-1">
            {workspace.name}
          </p>
        )}

        <p className="text-sm wd-text-muted text-center mt-2 max-w-[280px]">
          {reason === "Invite has expired"
            ? "This invite link has expired. Ask the workspace owner for a new one."
            : reason === "Invite has reached max uses"
              ? "This invite has been used the maximum number of times."
              : "The invite link may be incorrect or no longer active. Check with the person who shared it."}
        </p>

        <Link
          href="/app"
          className="wd-btn-primary mt-6 inline-flex items-center justify-center h-11 px-6 text-base no-underline"
        >
          Go to WorkDash
        </Link>
      </div>
    </div>
  );
}
