import React from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  SettingsSection,
  SettingsTextField,
  SettingsErrorBanner,
} from '../settings-primitives';
import { useProfileForm } from '../hooks/useProfileForm';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import useUserStore from '@/common/store/useStore';

interface AccountPanelProps {
  onClose: () => void;
}

function AccountPanel({ onClose }: AccountPanelProps) {
  const userName = useUserStore((state) => state.user.name);

  const avatar = useAvatarUpload();
  const profile = useProfileForm({
    isActive: true,
    onSuccess: onClose,
  });

  const isBusy = profile.isSaving || avatar.isUploading || avatar.isDeleting;
  const combinedError = avatar.error || profile.error;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (avatar.hasNewAvatar) {
      const url = await avatar.handleUpload();
      if (!url) return;
    }

    await profile.handleSave(event);
  };

  const displayImage = avatar.avatarPreview || avatar.currentImage;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SettingsSection label="Avatar">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatar.fileInputRef.current?.click()}
            disabled={isBusy}
            className="group relative h-16 w-16 shrink-0 rounded-full wd-bg-elevated overflow-hidden border wd-border-subtle disabled:opacity-50"
          >
            {displayImage ? (
              <img
                src={displayImage}
                alt="Avatar"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="inline-flex h-full w-full items-center justify-center text-lg font-bold wd-text-muted">
                {(userName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus size={18} className="text-white" />
            </span>
          </button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => avatar.fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border wd-border-subtle px-3 py-1.5 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
            >
              <ImagePlus size={14} />
              {displayImage ? 'Change Avatar' : 'Upload Avatar'}
            </button>

            {avatar.currentImage && !avatar.avatarPreview && (
              <button
                type="button"
                disabled={isBusy}
                onClick={avatar.handleDelete}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-[#ff7b7b] transition-colors hover:bg-[rgba(255,123,123,0.1)] disabled:opacity-50"
              >
                {avatar.isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Remove Avatar
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <input
          ref={avatar.fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={avatar.handleFileSelect}
        />

        <p className="mt-2 text-[10px] wd-text-muted">
          PNG, JPEG, WebP, or GIF. Max 5MB.
        </p>
      </SettingsSection>

      <SettingsSection label="Profile Preview">
        <p className="text-lg font-semibold wd-text-primary truncate">
          {profile.previewName}
        </p>
      </SettingsSection>

      <div className="space-y-3">
        <SettingsTextField
          label="Full Name"
          value={profile.name}
          onChange={profile.setName}
          maxLength={20}
          placeholder="Enter your full name"
          disabled={isBusy}
        />
        <SettingsTextField
          label="Nickname (Optional)"
          value={profile.nickname}
          onChange={profile.setNickname}
          maxLength={20}
          placeholder="Shown instead of full name"
          disabled={isBusy}
        />
      </div>

      <SettingsSection label="Bio" description="A short description visible on your profile">
        <div className="space-y-1.5">
          <textarea
            value={profile.bio}
            onChange={(e) => profile.handleBioChange(e.target.value)}
            rows={3}
            maxLength={profile.maxBioLength}
            placeholder="Write a short bio..."
            disabled={isBusy}
            className="w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 py-2 text-sm wd-text-primary outline-none resize-none focus:border-[var(--wd-border-strong)] disabled:opacity-50"
          />
          <p className="text-right text-[10px] wd-text-muted">
            {profile.bio.length}/{profile.maxBioLength}
          </p>
        </div>
      </SettingsSection>

      <SettingsErrorBanner message={combinedError} />

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="h-9 rounded-md border wd-border-subtle px-3 text-sm wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[rgba(88,101,242,0.6)] bg-[rgba(88,101,242,0.2)] px-3 text-sm font-semibold wd-text-primary transition-colors hover:bg-[rgba(88,101,242,0.3)] disabled:opacity-60"
        >
          {isBusy ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}

export default AccountPanel;
