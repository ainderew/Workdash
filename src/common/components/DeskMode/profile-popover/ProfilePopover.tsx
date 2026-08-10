import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '../UserAvatar';
import PresenceDot from '../PresenceDot';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';
import useUserStore from '@/common/store/useStore';
import type { ProfilePopoverState, SenderAvatar } from './types';
import { useProfilePopover } from './hooks/useProfilePopover';
import { useBioDraft } from './hooks/useBioDraft';
import { useBannerEditor } from './hooks/useBannerEditor';
import { ProfileBanner, getBannerStyle } from './ProfileBanner';
import { ProfileBannerEditor } from './ProfileBannerEditor';
import { ProfileBioSection } from './ProfileBioSection';
import { ProfileActionButtons, ProfileQuickMessage } from './ProfileActions';
import { ProfileStatusPicker } from './ProfileStatusPicker';
import CustomStatusPickerRow from '@/common/components/CustomStatus/CustomStatusPickerRow';
import CustomStatusInline from '@/common/components/CustomStatus/CustomStatusInline';
import { ProfileEffectOverlay } from './ProfileEffectOverlay';
import { ProfileEffectPicker } from './ProfileEffectPicker';
import { resolveProfileEffect, type ProfileEffectId } from './profileEffects';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import { DotaMedalBadge } from './DotaMedalBadge';
import { BetrayalStatsBadge } from './BetrayalStatsBadge';
import { AchievementBadges } from './AchievementBadges';
import { ActivityText } from '../ActivityText';
import AwardTag from '@/common/components/AwardTag/AwardTag';
import type { AwardTagData } from '@/communication/chatV2/_types';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';
import { formatLastSeen } from '@/common/utils/formatLastSeen';

interface ProfilePopoverProps {
  popover: ProfilePopoverState;
  onClose: () => void;
  onAvatarUpdated: (avatar: SenderAvatar) => void;
  awardTag?: AwardTagData | null;
}

export function ProfilePopover({
  popover,
  onClose,
  onAvatarUpdated,
  awardTag,
}: ProfilePopoverProps) {
  const updateUser = useUserStore((state) => state.updateUser);
  const { profile, setProfile, isLoading, error } = useProfilePopover(
    popover.senderUserId,
    onClose,
  );

  const bio = useBioDraft(profile, setProfile);

  const banner = useBannerEditor(profile?.user.banner, (newBanner) => {
    if (!profile) return;
    setProfile({
      ...profile,
      user: { ...profile.user, banner: newBanner },
    });
  });

  const isSelf = profile?.isSelf ?? false;

  const currentEffect: ProfileEffectId =
    resolveProfileEffect(profile?.user.profileEffect) ?? 'none';

  const handleSelectEffect = useCallback(
    async (effect: ProfileEffectId) => {
      if (!profile) return;
      // Optimistic — plays immediately for the current view
      setProfile({
        ...profile,
        user: { ...profile.user, profileEffect: effect },
      });
      try {
        await ChatV2Service.getInstance().updateOwnUserProfile({
          profileEffect: effect === 'none' ? null : effect,
        });
      } catch {
        toast('Failed to save profile effect');
      }
    },
    [profile, setProfile],
  );

  const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
  const isOffline = usePresenceStore(
    (s) =>
      (s.presenceMap[popover.senderUserId]?.statusId ?? 'offline') === 'offline',
  );
  const lastSeen = usePresenceStore(
    (s) => s.lastSeenMap[popover.senderUserId] ?? null,
  );

  // --- Viewport-aware positioning ---
  const popoverRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight?: number;
    caretTop?: number;
  } | null>(null);

  const anchorRect = popover.anchorRect;
  const anchorCenterY = anchorRect
    ? anchorRect.top + anchorRect.height / 2
    : null;

  const recalcPosition = useCallback(() => {
    const el = popoverRef.current;
    if (!el) return;

    const pad = 8;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    // Use scrollHeight to get the full content height even if currently clipped
    const elHeight = el.scrollHeight;
    const elWidth = el.offsetWidth;

    // Horizontal: clamp so popover stays within viewport
    let left = popover.x;
    if (left + elWidth > vpW - pad) {
      left = vpW - elWidth - pad;
    }
    if (left < pad) left = pad;

    const computeCaretTop = (popoverTopPx: number, popoverHeightPx: number) => {
      if (anchorCenterY == null) return undefined;
      const offsetFromTop = anchorCenterY - popoverTopPx;
      return Math.max(16, Math.min(popoverHeightPx - 16, offsetFromTop));
    };

    // Vertical: determine best placement
    if (popover.anchorBottom) {
      const bottomVal = vpH - popover.y;
      const spaceAbove = popover.y - pad;
      const spaceBelow = vpH - popover.y - pad;

      if (elHeight <= spaceAbove) {
        // Fits above — bottom-anchor as requested
        const top = vpH - bottomVal - elHeight;
        setAdjustedPos({
          bottom: bottomVal,
          left,
          caretTop: computeCaretTop(top, elHeight),
        });
      } else if (elHeight <= spaceBelow) {
        // Flip to top-anchor
        setAdjustedPos({
          top: popover.y,
          left,
          caretTop: computeCaretTop(popover.y, elHeight),
        });
      } else {
        // Can't fit either way — use whichever side has more room, with maxHeight + scroll
        if (spaceAbove >= spaceBelow) {
          const top = vpH - bottomVal - spaceAbove;
          setAdjustedPos({
            bottom: bottomVal,
            left,
            maxHeight: spaceAbove,
            caretTop: computeCaretTop(top, spaceAbove),
          });
        } else {
          setAdjustedPos({
            top: popover.y,
            left,
            maxHeight: spaceBelow,
            caretTop: computeCaretTop(popover.y, spaceBelow),
          });
        }
      }
    } else {
      const spaceBelow = vpH - popover.y - pad;
      const spaceAbove = popover.y - pad;

      if (elHeight <= spaceBelow) {
        // Fits below — top-anchor as requested
        setAdjustedPos({
          top: popover.y,
          left,
          caretTop: computeCaretTop(popover.y, elHeight),
        });
      } else if (elHeight <= spaceAbove) {
        // Flip to bottom-anchor (grow upward from click point)
        const bottomVal = vpH - popover.y;
        const top = vpH - bottomVal - elHeight;
        setAdjustedPos({
          bottom: bottomVal,
          left,
          caretTop: computeCaretTop(top, elHeight),
        });
      } else {
        // Can't fit either way — use whichever side has more room, with maxHeight + scroll
        if (spaceBelow >= spaceAbove) {
          setAdjustedPos({
            top: popover.y,
            left,
            maxHeight: spaceBelow,
            caretTop: computeCaretTop(popover.y, spaceBelow),
          });
        } else {
          const bottomVal = vpH - popover.y;
          const top = vpH - bottomVal - spaceAbove;
          setAdjustedPos({
            bottom: bottomVal,
            left,
            maxHeight: spaceAbove,
            caretTop: computeCaretTop(top, spaceAbove),
          });
        }
      }
    }
  }, [popover.x, popover.y, popover.anchorBottom, anchorCenterY]);

  // Use ResizeObserver to recalculate whenever popover content changes size,
  // and reposition on window resize instead of closing
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    // Initial calculation
    recalcPosition();

    const observer = new ResizeObserver(() => {
      recalcPosition();
    });
    observer.observe(el);

    window.addEventListener('resize', recalcPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalcPosition);
    };
  }, [recalcPosition]);

  // --- Inline avatar upload (was ProfileIdentity) ---
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast('Invalid file type', {
        description: 'Allowed: PNG, JPEG, WebP, GIF',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('File too large', { description: 'Max 5MB' });
      return;
    }

    const jwt = tokenStore.getJwt();
    if (!jwt) {
      toast('Not authenticated');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/users/me/avatar`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
          body: formData,
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Upload failed: ${response.status}`);
      }
      const avatarUrl: string = body.avatarUrl;
      updateUser({ image: avatarUrl });
      tokenStore.updateUser({ image: avatarUrl });
      useUserStore.getState().updateBackendUser({ image: avatarUrl });
      onAvatarUpdated({ mode: 'image', src: avatarUrl });
      toast('Avatar updated');
    } catch (err) {
      toast('Failed to upload avatar', {
        description:
          err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const avatarElement = (
    <UserAvatar
      name={popover.senderName}
      spriteStyle={
        popover.senderAvatar.mode === 'sprite'
          ? popover.senderAvatar.style
          : null
      }
      image={
        popover.senderAvatar.mode === 'image'
          ? popover.senderAvatar.src
          : null
      }
      size="xl"
      className="border-[3px] border-[var(--wd-bg-panel)] ring-1 ring-white/[0.08]"
    />
  );

  // Before adjustment is calculated, use the caller's position as initial (hidden to avoid flash)
  const positionStyle: React.CSSProperties = adjustedPos
    ? {
        left: adjustedPos.left,
        ...(adjustedPos.bottom != null
          ? { bottom: adjustedPos.bottom }
          : { top: adjustedPos.top }),
        ...(adjustedPos.maxHeight != null
          ? { maxHeight: adjustedPos.maxHeight, overflowY: 'auto' as const }
          : {}),
      }
    : {
        left: popover.x,
        ...(popover.anchorBottom
          ? { bottom: typeof window !== 'undefined' ? window.innerHeight - popover.y : 0 }
          : { top: popover.y }),
        visibility: 'hidden' as const,
      };

  const caretSideStyle: React.CSSProperties | null =
    anchorRect && adjustedPos?.caretTop != null
      ? popover.preferredSide === 'left'
        ? { right: -6, top: adjustedPos.caretTop - 6 }
        : { left: -6, top: adjustedPos.caretTop - 6 }
      : null;

  return (
    <div
      ref={popoverRef}
      data-user-profile-popover="true"
      className="fixed z-[170] w-[340px] rounded-xl border border-white/[0.06] wd-bg-panel backdrop-blur-xl shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.2),0_16px_40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200"
      style={positionStyle}
    >
      {caretSideStyle && (
        <span
          aria-hidden="true"
          className="absolute w-3 h-3 rotate-45 wd-bg-panel border border-white/[0.06]"
          style={caretSideStyle}
        />
      )}
      <ProfileEffectOverlay effect={profile?.user.profileEffect} />
      {/* Banner: show editor or display mode */}
      {banner.isEditing ? (
        <div>
          <div
            className="h-24 rounded-t-xl overflow-hidden transition-all duration-200"
            style={getBannerStyle(banner.displayBanner)}
          />
          <div className="border-b wd-border-subtle max-h-[180px] overflow-y-auto">
            <ProfileBannerEditor
              preview={banner.preview}
              isSaving={banner.isSaving}
              onSelectSolid={banner.selectSolid}
              onSelectGradient={banner.selectGradient}
              onSelectImageFile={banner.selectImageFile}
              onClearBanner={banner.clearBanner}
              onApply={() => {
                void banner.applyBanner();
              }}
              onCancel={banner.closeEditor}
            />
          </div>
        </div>
      ) : (
        <ProfileBanner
          banner={banner.displayBanner}
          isSelf={isSelf}
          onEditClick={banner.openEditor}
        >
          <ProfileActionButtons
            senderUserId={popover.senderUserId}
            senderName={popover.senderName}
            isSelf={isSelf}
            friendshipStatus={profile?.friendshipStatus ?? null}
          />
        </ProfileBanner>
      )}

      {/* Identity: avatar + name + ID (inlined) */}
      <div className={`px-5 pb-3 relative z-10 ${banner.isEditing ? 'mt-2' : '-mt-8'}`}>
        {isSelf ? (
          <label className="group relative block w-16 h-16 cursor-pointer">
            {avatarElement}
            <PresenceDot userId={popover.senderUserId} size="xl" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {isUploadingAvatar ? (
                <Loader2
                  size={18}
                  className="text-white animate-spin"
                />
              ) : (
                <ImagePlus size={18} className="text-white" />
              )}
            </span>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={isUploadingAvatar}
              onChange={handleAvatarUpload}
            />
          </label>
        ) : (
          <div className="relative w-16 h-16">
            {avatarElement}
            <PresenceDot userId={popover.senderUserId} size="xl" />
          </div>
        )}

        <div className="mt-2.5 space-y-0.5 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-[17px] font-semibold tracking-[-0.01em] wd-text-primary truncate">
              {popover.senderName}
            </p>
            {awardTag && (
              <AwardTag
                type={awardTag.type}
                label={awardTag.label}
                size="sm"
              />
            )}
          </div>
          <p className="text-[11px] font-mono wd-text-muted opacity-60">
            ID {popover.senderUserId}
          </p>
          <CustomStatusInline
            userId={popover.senderUserId}
            className="!text-[12px] mt-1"
          />
          <ActivityText userId={popover.senderUserId} workspaceId={selectedWorkspaceId} />
          {!isSelf && isOffline && lastSeen != null && (
            <p className="text-[11px] wd-text-muted mt-0.5">
              Last seen {formatLastSeen(lastSeen)}
            </p>
          )}
        </div>
      </div>

      {/* Profile content */}
      <div className="px-5 pb-5">
        {isLoading ? (
          <p className="text-sm wd-text-muted">Loading profile...</p>
        ) : error ? (
          <p className="text-sm wd-text-danger">{error}</p>
        ) : profile ? (
          <div className="space-y-3.5">
            <ProfileBioSection
              bio={profile.user.bio}
              isSelf={isSelf}
              bioDraft={bio.bioDraft}
              isBioEditing={bio.isBioEditing}
              isSavingBio={bio.isSavingBio}
              onStartEdit={() => bio.setIsBioEditing(true)}
              onCancelEdit={bio.cancelBioEdit}
              onBioChange={bio.handleBioChange}
              onSaveBio={() => {
                void bio.handleSaveBio();
              }}
            />

            {profile && (
              <>
                <AchievementBadges userId={popover.senderUserId} />
                <DotaMedalBadge userId={popover.senderUserId} />
                <BetrayalStatsBadge userId={popover.senderUserId} />
              </>
            )}

            {!isSelf && (
              <div className="mt-1">
                <ProfileQuickMessage
                  senderUserId={popover.senderUserId}
                  senderName={popover.senderName}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {isSelf && !isLoading && !error && profile && (
        <div className="border-t border-white/[0.06] py-1">
          <ProfileEffectPicker
            value={currentEffect}
            onSelect={(effect) => void handleSelectEffect(effect)}
          />
          <ProfileStatusPicker />
          <CustomStatusPickerRow />
        </div>
      )}
    </div>
  );
}

