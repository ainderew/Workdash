import React from 'react';
import useChatV2Store from '@/common/store/chatV2Store';
import { useCharacterFaceAvatar } from '@/common/utils/characterFaceAvatar';

interface CallAvatarProps {
  userId: number;
  displayName: string;
  channelId: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

const textSizes = {
  sm: 'text-[8px]',
  md: 'text-[9px]',
};

export default function CallAvatar({
  userId,
  displayName,
  channelId,
  size = 'md',
}: CallAvatarProps) {
  const members = useChatV2Store((s) => s.membersByRoomId[channelId]);
  const member = members?.find((m) => m.userId === userId);
  const profileImage = member?.user?.image;
  const characterCustomization = member?.user?.characterCustomization ?? null;
  const spriteAvatar = useCharacterFaceAvatar(characterCustomization);

  const dim = sizeClasses[size];
  const borderClass = size === 'sm'
    ? 'ring-1 ring-[var(--wd-surface-panel)]'
    : 'border wd-border-subtle';
  const sharedClass = `inline-flex items-center justify-center ${dim} rounded-full ${borderClass}`;

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={displayName}
        title={displayName}
        className={`${sharedClass} object-cover`}
      />
    );
  }

  if (spriteAvatar) {
    return (
      <img
        src={spriteAvatar}
        alt={displayName}
        title={displayName}
        className={sharedClass}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }

  return (
    <span
      className={`${sharedClass} ${textSizes[size]} font-bold`}
      style={{
        backgroundColor: 'var(--wd-surface-elevated)',
        color: 'var(--wd-text-primary)',
      }}
      title={displayName}
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}
