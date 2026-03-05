import React from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useProfileForm } from '../hooks/useProfileForm';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import {
  SettingsSection,
  SettingsTextField,
  SettingsErrorBanner,
} from '../settings-primitives';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
  const profile = useProfileForm(isOpen);
  const avatar = useAvatarUpload(isOpen);

  const isBusy =
    profile.isSaving || avatar.isUploading || avatar.isDeleting;
  const combinedError = avatar.error || profile.error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const onAvatarUpload = avatar.hasNewAvatar
      ? () => avatar.handleUpload()
      : undefined;
    const success = await profile.handleSave(onAvatarUpload);
    if (success) onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <SettingsSection label="Avatar">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => avatar.fileInputRef.current?.click()}
            disabled={isBusy}
            className="group relative h-20 w-20 shrink-0 rounded-full wd-bg-elevated overflow-hidden border-2 wd-border-subtle disabled:opacity-50 transition-all hover:border-[var(--wd-accent)]"
          >
            {avatar.avatarPreview || avatar.currentAvatar ? (
              <img
                src={avatar.avatarPreview || avatar.currentAvatar || ''}
                alt="Avatar"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="inline-flex h-full w-full items-center justify-center text-xl font-bold wd-text-muted">
                {(profile.name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus size={20} className="text-white" />
            </span>
          </button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => avatar.fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border wd-border-subtle px-3.5 py-2 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
            >
              <ImagePlus size={14} />
              {avatar.currentAvatar || avatar.avatarPreview
                ? 'Change Avatar'
                : 'Upload Avatar'}
            </button>

            {avatar.currentAvatar && !avatar.avatarPreview && (
              <button
                type="button"
                disabled={isBusy}
                onClick={avatar.handleDelete}
                className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-[var(--wd-danger)] transition-colors hover:bg-[var(--wd-danger-soft)] disabled:opacity-50"
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

            <p className="text-[10px] wd-text-muted">
              PNG, JPEG, WebP, or GIF. Max 5MB.
            </p>
          </div>
        </div>

        <input
          ref={avatar.fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={avatar.handleFileSelect}
        />
      </SettingsSection>

      {/* Profile Info - grouped together */}
      <SettingsSection label="Profile">
        <div className="space-y-4">
          <SettingsTextField
            label="Full Name"
            value={profile.name}
            onChange={profile.setName}
            placeholder="Enter your full name"
            maxLength={20}
            disabled={isBusy}
          />

          <SettingsTextField
            label="Nickname (Optional)"
            value={profile.nickname}
            onChange={profile.setNickname}
            placeholder="Shown instead of full name"
            maxLength={20}
            disabled={isBusy}
          />

          {/* Inline preview */}
          <div className="flex items-center gap-3 rounded-lg wd-bg-elevated px-3.5 py-3 border wd-border-subtle">
            <div className="h-8 w-8 shrink-0 rounded-full wd-bg-panel-2 border wd-border-subtle overflow-hidden flex items-center justify-center">
              {avatar.avatarPreview || avatar.currentAvatar ? (
                <img
                  src={avatar.avatarPreview || avatar.currentAvatar || ''}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold wd-text-muted">
                  {(profile.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold wd-text-muted">
                Display Name Preview
              </p>
              <p className="text-sm font-semibold wd-text-primary truncate">
                {profile.previewName}
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsErrorBanner message={combinedError} />

      {/* Sticky action bar */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="h-9 rounded-lg border wd-border-subtle px-4 text-sm font-medium wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--wd-accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--wd-accent-hover)] disabled:opacity-60"
        >
          {profile.isSaving ? (
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
