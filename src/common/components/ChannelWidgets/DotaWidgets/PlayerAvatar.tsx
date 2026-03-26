import React from "react";
import Image from "next/image";

interface Props {
  avatarUrl: string | null | undefined;
  displayName: string;
  size?: number;
}

export function PlayerAvatar({ avatarUrl, displayName, size = 18 }: Props) {
  if (!avatarUrl) {
    return (
      <div
        className="rounded-full bg-[var(--wd-surface-elevated)] flex items-center justify-center text-[9px] font-bold wd-text-muted shrink-0"
        style={{ width: size, height: size }}
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
      className="rounded-full shrink-0"
    />
  );
}
