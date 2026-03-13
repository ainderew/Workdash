import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Users, Clock } from "lucide-react";
import { toWorkspaceInitials } from "@/common/utils/workspaceDisplay";

export interface InviteMetadata {
  valid: boolean;
  reason?: string;
  workspace?: {
    name: string;
    iconUrl: string | null;
    memberCount: number;
  };
  inviter?: {
    name: string;
    avatarUrl: string | null;
  };
  expiresAt?: string | null;
  isMember?: boolean;
  workspaceId?: string;
}

interface InvitePreviewCardProps {
  metadata: InviteMetadata;
  isAuthenticated: boolean;
  isJoining: boolean;
  onJoin: () => void;
  onSignIn: () => void;
}

function formatTimeRemaining(expiresAt: string): string | null {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `Expires in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (hours < 24) {
    return `Expires in ${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  const days = Math.floor(hours / 24);
  return `Expires in ${days} day${days !== 1 ? "s" : ""}`;
}

export function InvitePreviewCard({
  metadata,
  isAuthenticated,
  isJoining,
  onJoin,
  onSignIn,
}: InvitePreviewCardProps) {
  const { workspace, inviter, expiresAt } = metadata;
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Extract dominant color from workspace icon
  useEffect(() => {
    if (!workspace?.iconUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setAccentColor(`${r} ${g} ${b}`);
    };
    img.src = workspace.iconUrl;
  }, [workspace?.iconUrl]);

  if (!workspace) return null;

  const expirationWarning = expiresAt ? formatTimeRemaining(expiresAt) : null;
  const showExpirationWarning =
    expirationWarning && expiresAt
      ? new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
      : false;

  return (
    <div className="wd-invite-card-wrapper">
      {/* Hidden canvas for color extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Radial gradient bg using extracted color */}
      {accentColor && (
        <div
          className="fixed inset-0 pointer-events-none -z-10"
          style={{
            background: `radial-gradient(ellipse at center, rgb(${accentColor} / 0.15) 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="wd-invite-card">
        {/* Workspace icon */}
        <div className="w-20 h-20 rounded-[14px] wd-bg-elevated flex items-center justify-center text-2xl font-bold wd-text-primary overflow-hidden shrink-0">
          {workspace.iconUrl ? (
            <Image
              src={workspace.iconUrl}
              alt=""
              width={80}
              height={80}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">
              {toWorkspaceInitials(workspace.name)}
            </span>
          )}
        </div>

        {/* Workspace name */}
        <h1 className="text-2xl font-semibold wd-text-primary text-center mt-4">
          {workspace.name}
        </h1>

        {/* Member count */}
        <div className="flex items-center gap-1.5 wd-text-muted text-sm mt-1">
          <Users size={14} />
          <span>
            {workspace.memberCount} member
            {workspace.memberCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Inviter */}
        {inviter && (
          <div className="flex items-center gap-2 mt-3">
            {inviter.avatarUrl ? (
              <Image
                src={inviter.avatarUrl}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full wd-bg-elevated" />
            )}
            <span className="text-sm wd-text-secondary">
              Invited by {inviter.name}
            </span>
          </div>
        )}

        {/* Expiration warning */}
        {showExpirationWarning && expirationWarning && (
          <div className="flex items-center gap-1.5 text-xs mt-3" style={{ color: "var(--wd-warning)" }}>
            <Clock size={12} />
            <span>{expirationWarning}</span>
          </div>
        )}

        {/* Action */}
        <div className="mt-6 w-full">
          {isAuthenticated ? (
            <button
              type="button"
              className="wd-btn-primary w-full h-11 inline-flex items-center justify-center gap-2 text-base"
              onClick={onJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Joining...
                </>
              ) : (
                `Join ${workspace.name}`
              )}
            </button>
          ) : (
            <button
              type="button"
              className="wd-btn-primary w-full h-11 inline-flex items-center justify-center gap-2 text-base"
              onClick={onSignIn}
            >
              Sign in to Join
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
