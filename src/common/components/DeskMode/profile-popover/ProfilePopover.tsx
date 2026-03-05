import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '../UserAvatar';
import { CONFIG } from '@/common/utils/config';
import useUserStore from '@/common/store/useStore';
import type { ProfilePopoverState, SenderAvatar } from './types';
import { useProfilePopover } from './hooks/useProfilePopover';
import { useBioDraft } from './hooks/useBioDraft';
import { useBannerEditor } from './hooks/useBannerEditor';
import { ProfileBanner, getBannerStyle } from './ProfileBanner';
import { ProfileBannerEditor } from './ProfileBannerEditor';
import { ProfileBioSection } from './ProfileBioSection';
import { ProfileActionButtons, ProfileDmButton } from './ProfileActions';

interface ProfilePopoverProps {
  popover: ProfilePopoverState;
  onClose: () => void;
  onAvatarUpdated: (avatar: SenderAvatar) => void;
}

export function ProfilePopover({
  popover,
  onClose,
  onAvatarUpdated,
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

    const jwt = window.__BACKEND_JWT__;
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
      if (window.__BACKEND_USER__) {
        window.__BACKEND_USER__ = {
          ...window.__BACKEND_USER__,
          image: avatarUrl,
        };
      }
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
      className="border-4 wd-border-strong"
    />
  );

  return (
    <div
      data-user-profile-popover="true"
      className="fixed z-[170] w-[360px] rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: popover.x,
        ...(popover.anchorBottom
          ? { bottom: window.innerHeight - popover.y }
          : { top: popover.y }),
      }}
    >
      {/* Banner: show editor or display mode */}
      {banner.isEditing ? (
        <div>
          <div
            className="h-24 transition-all duration-200"
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
      <div className={`px-4 pb-4 relative z-10 ${banner.isEditing ? 'mt-2' : '-mt-8'}`}>
        {isSelf ? (
          <label className="group relative block w-16 h-16 cursor-pointer">
            {avatarElement}
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
          avatarElement
        )}

        <div className="mt-3">
          <p className="text-xl font-semibold wd-text-primary truncate">
            {popover.senderName}
          </p>
          <p className="text-xs wd-text-muted">
            User ID: {popover.senderUserId}
          </p>
        </div>
      </div>

      {/* Profile content */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <p className="text-sm wd-text-muted">Loading profile...</p>
        ) : error ? (
          <p className="text-sm wd-text-danger">{error}</p>
        ) : profile ? (
          <div className="space-y-3">
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

            {!isSelf && (
              <ProfileDmButton
                senderUserId={popover.senderUserId}
                senderName={popover.senderName}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
