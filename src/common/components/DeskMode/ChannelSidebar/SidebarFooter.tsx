import React, { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import useUserStore from '@/common/store/useStore';
import { getDisplayName } from '@/common/utils/displayName';
import DeskModeControls from '../DeskModeControls';
import FocusToggleButton from '../FocusToggleButton';
import UserAvatar from '../UserAvatar';
import PresenceDot from '../PresenceDot';
import StatusLabel from '../StatusLabel';
import { ProfilePopover } from '../profile-popover';
import type { ProfilePopoverState, SenderAvatar } from '../profile-popover';

interface SidebarFooterProps {
  onOpenSettings: () => void;
}

function SidebarFooter({ onOpenSettings }: SidebarFooterProps) {
  const user = useUserStore((state) => state.user);
  const backendUser = useUserStore((s) => s.backendUser);

  const [isAvatarLoadFailed, setIsAvatarLoadFailed] = useState(false);
  const [footerProfilePopover, setFooterProfilePopover] =
    useState<ProfilePopoverState | null>(null);

  const displayName = getDisplayName(
    {
      nickname: user.nickname ?? backendUser?.nickname ?? null,
      name: user.name || backendUser?.name || null,
    },
    'You',
  );
  const localBackendUserId = backendUser?.id;
  const spriteSheetDataUrl = user.spriteSheetDataUrl?.trim() || '';
  const avatarUrl = user.image?.trim() || backendUser?.image?.trim() || '';
  const showAvatarImage = avatarUrl.length > 0 && !isAvatarLoadFailed;

  const avatarSpriteStyles = useMemo<React.CSSProperties>(() => {
    if (!spriteSheetDataUrl) return {};

    return {
      backgroundImage: `url('${spriteSheetDataUrl}')`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '-94px -20px',
      imageRendering: 'pixelated',
    };
  }, [spriteSheetDataUrl]);

  const defaultSpriteStyles = useMemo<React.CSSProperties>(
    () => ({
      backgroundImage:
        "url('/assets/characters/Characters/Adam/Adam_idle_16x16.png')",
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'auto 200%',
      backgroundPosition: '-607px -16px',
      imageRendering: 'pixelated',
    }),
    [],
  );

  useEffect(() => {
    setIsAvatarLoadFailed(false);
  }, [avatarUrl]);

  return (
    <>
      <footer className="border-t wd-border-subtle wd-bg-panel-2 p-3 wd-panel-height flex justify-center items-center">
        <div className="flex-1 flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 rounded-md p-0.5 -m-0.5 transition-colors hover:bg-[var(--wd-surface-base)] cursor-pointer"
            title="Click to view profile"
            onClick={(event) => {
              if (typeof localBackendUserId !== 'number') return;

              const senderAvatar: SenderAvatar = showAvatarImage
                ? { mode: 'image', src: avatarUrl }
                : spriteSheetDataUrl
                  ? { mode: 'sprite', style: avatarSpriteStyles }
                  : { mode: 'fallback' };

              const rect = event.currentTarget.getBoundingClientRect();

              setFooterProfilePopover({
                x: rect.left,
                y: rect.top,
                anchorBottom: true,
                senderUserId: localBackendUserId,
                senderName: displayName,
                senderAvatar,
              });
            }}
          >
            <div className="relative shrink-0">
              <UserAvatar
                name={displayName}
                spriteStyle={
                  showAvatarImage
                    ? null
                    : spriteSheetDataUrl
                      ? avatarSpriteStyles
                      : defaultSpriteStyles
                }
                image={showAvatarImage ? avatarUrl : null}
                className="ring-1 wd-border-subtle"
                onImageError={() => setIsAvatarLoadFailed(true)}
              />
              {typeof localBackendUserId === 'number' && (
                <PresenceDot userId={localBackendUserId} size="xs" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold wd-text-primary">
                {displayName}
              </p>
              <StatusLabel />
            </div>
          </button>

          <div className="relative flex items-center gap-1.5 shrink-0">
            <FocusToggleButton />
            <DeskModeControls compact showMicrophoneSelector={false} />

            <button
              type="button"
              title="Settings"
              aria-label="Settings"
              onClick={onOpenSettings}
              className="relative h-7 w-7 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:bg-[var(--wd-surface-base)] hover:wd-text-primary"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      </footer>
      {footerProfilePopover && (
        <ProfilePopover
          popover={footerProfilePopover}
          onClose={() => setFooterProfilePopover(null)}
          onAvatarUpdated={(newAvatar) => {
            setFooterProfilePopover({
              ...footerProfilePopover,
              senderAvatar: newAvatar,
            });
          }}
        />
      )}
    </>
  );
}

export default SidebarFooter;
