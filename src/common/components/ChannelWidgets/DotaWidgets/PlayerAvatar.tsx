import React from "react";
import Image from "next/image";

interface Props {
  avatarUrl: string | null | undefined;
  displayName: string;
  size?: number;
}

export function PlayerAvatar({ avatarUrl, displayName, size = 24 }: Props) {
  if (!avatarUrl) {
    return (
      <div
        className="rounded-full bg-[var(--wd-surface-elevated)] ring-1 ring-[var(--wd-border-subtle)] flex items-center justify-center font-bold wd-text-muted shrink-0"
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={avatarUrl}
      alt={`${displayName}'s avatar`}
      width={size}
      height={size}
      className="rounded-full shrink-0 ring-1 ring-[var(--wd-border-subtle)]"
    />
  );
}
