import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ImagePlus, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  SettingsTextField,
  SettingsErrorBanner,
} from '../settings-primitives';
import { useProfileForm } from '../hooks/useProfileForm';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { useBannerEditor } from '../../profile-popover/hooks/useBannerEditor';
import { ProfileBannerEditor } from '../../profile-popover/ProfileBannerEditor';
import { getBannerStyle } from '../../profile-popover/ProfileBanner';
import type { BannerConfig } from '@/communication/chatV2/_types';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import useUserStore from '@/common/store/useStore';

interface AccountPanelProps {
  onClose: () => void;
}

function AccountPanel({ onClose }: AccountPanelProps) {
  const userName = useUserStore((state) => state.user.name);
  const backendUser = useUserStore((s) => s.backendUser);
  const localBackendUserId = backendUser?.id ?? null;

  // ---------- User ID copy ----------
  const [userIdCopyState, setUserIdCopyState] = useState<
    'idle' | 'copied' | 'failed'
  >('idle');
  const userIdCopyResetRef = useRef<number | null>(null);

  const handleCopyUserId = async () => {
    if (typeof localBackendUserId !== 'number') {
      setUserIdCopyState('failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(String(localBackendUserId));
      setUserIdCopyState('copied');
    } catch {
      setUserIdCopyState('failed');
    }
    if (userIdCopyResetRef.current !== null) {
      window.clearTimeout(userIdCopyResetRef.current);
    }
    userIdCopyResetRef.current = window.setTimeout(() => {
      setUserIdCopyState('idle');
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (userIdCopyResetRef.current !== null) {
        window.clearTimeout(userIdCopyResetRef.current);
      }
    };
  }, []);

  // ---------- Banner ----------
  const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
  const [currentBanner, setCurrentBanner] = useState<BannerConfig>(null);
  const [isBannerLoading, setIsBannerLoading] = useState(false);

  useEffect(() => {
    if (typeof localBackendUserId !== 'number') return;
    let cancelled = false;
    setIsBannerLoading(true);
    void (async () => {
      try {
        const profile = await chatV2Service.getUserProfile(localBackendUserId);
        if (!cancelled) setCurrentBanner(profile.user.banner ?? null);
      } catch {
        // ignore — banner preview just stays default
      } finally {
        if (!cancelled) setIsBannerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [chatV2Service, localBackendUserId]);

  const banner = useBannerEditor(currentBanner, (newBanner) => {
    setCurrentBanner(newBanner);
  });

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
      {/* ── Hero Profile Card ── */}
      <div
        className="rounded-xl border wd-border-subtle overflow-hidden"
        style={{ backgroundColor: 'var(--wd-surface-panel-2)' }}
      >
        {/* Banner area */}
        <div className="relative">
          {isBannerLoading ? (
            <div
              className="h-[100px] flex items-center justify-center"
              style={getBannerStyle(null)}
            >
              <Loader2 size={18} className="animate-spin wd-text-muted" />
            </div>
          ) : (
            <>
              <div
                className="h-[100px] transition-all duration-300"
                style={getBannerStyle(banner.displayBanner)}
              >
                {banner.displayBanner?.type === 'image' && (
                  <div className="absolute inset-0 h-[100px] bg-black/10" aria-hidden="true" />
                )}
              </div>

              {/* Banner edit overlay */}
              {!banner.isEditing && (
                <button
                  type="button"
                  onClick={banner.openEditor}
                  disabled={isBusy}
                  className="absolute inset-0 h-[100px] flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 hover:bg-black/40 hover:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 text-[11px] font-medium text-white/90">
                    <Pencil size={12} />
                    Edit Banner
                  </span>
                </button>
              )}
            </>
          )}

          {/* Banner editor panel */}
          {banner.isEditing && (
            <div className="border-t wd-border-subtle">
              <ProfileBannerEditor
                preview={banner.preview}
                isSaving={banner.isSaving}
                onSelectSolid={banner.selectSolid}
                onSelectGradient={banner.selectGradient}
                onSelectImageFile={banner.selectImageFile}
                onClearBanner={banner.clearBanner}
                onApply={() => { void banner.applyBanner(); }}
                onCancel={banner.closeEditor}
              />
            </div>
          )}
        </div>

        {/* Identity row */}
        <div className="relative px-5 pb-4">
          <div className="-mt-9 mb-3 flex items-end gap-4">
            <button
              type="button"
              onClick={() => avatar.fileInputRef.current?.click()}
              disabled={isBusy}
              className="group relative h-[72px] w-[72px] shrink-0 rounded-full overflow-hidden border-[3px] ring-1 ring-white/[0.06] disabled:opacity-50 cursor-pointer"
              style={{
                borderColor: 'var(--wd-surface-panel-2)',
                background: 'var(--wd-surface-elevated)',
              }}
            >
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Avatar"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="inline-flex h-full w-full items-center justify-center text-xl font-bold wd-text-muted">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <ImagePlus size={18} className="text-white" />
              </span>
            </button>

            {/* Avatar actions */}
            <div className="flex items-center gap-1.5 pb-1">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => avatar.fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border wd-border-subtle px-2.5 py-1 text-[11px] font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
              >
                <ImagePlus size={12} />
                {displayImage ? 'Change' : 'Upload'}
              </button>

              {avatar.currentImage && !avatar.avatarPreview && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={avatar.handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[var(--wd-danger)] transition-colors hover:bg-[color:var(--wd-danger-soft)] disabled:opacity-50"
                >
                  {avatar.isDeleting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      Remove
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Name + User ID badge */}
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-lg font-semibold tracking-[-0.01em] wd-text-primary truncate">
              {profile.previewName}
            </p>
            <button
              type="button"
              onClick={() => { void handleCopyUserId(); }}
              disabled={typeof localBackendUserId !== 'number'}
              title="Click to copy User ID"
              className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono wd-text-muted border wd-border-subtle transition-all hover:wd-text-primary hover:border-[var(--wd-border-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
            >
              {userIdCopyState === 'copied' ? (
                <>
                  <Check size={10} className="text-[var(--wd-success)]" />
                  <span className="text-[var(--wd-success)]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={10} />
                  <span>
                    ID {typeof localBackendUserId === 'number' ? localBackendUserId : '\u2014'}
                  </span>
                </>
              )}
            </button>
          </div>

          <p className="mt-1 text-[10px] wd-text-muted">
            PNG, JPEG, WebP, or GIF. Max 5MB.
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={avatar.fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={avatar.handleFileSelect}
        />
      </div>

      {/* ── Profile Details ── */}
      <div
        className="rounded-xl border wd-border-subtle p-4 space-y-4"
        style={{ backgroundColor: 'var(--wd-surface-panel-2)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest wd-text-muted flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'var(--wd-accent)' }}
            aria-hidden="true"
          />
          Profile Details
        </p>

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

        <div className="h-px" style={{ backgroundColor: 'var(--wd-border-subtle)' }} />

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest wd-text-muted">
              About Me
            </label>
            <span className="text-[9px] tabular-nums wd-text-muted opacity-60">
              {profile.bio.length}/{profile.maxBioLength}
            </span>
          </div>
          <textarea
            value={profile.bio}
            onChange={(e) => profile.handleBioChange(e.target.value)}
            rows={3}
            maxLength={profile.maxBioLength}
            placeholder="Write a short bio..."
            disabled={isBusy}
            className="wd-settings-input w-full rounded-lg border wd-border-subtle px-3 py-2.5 text-sm wd-text-primary outline-none resize-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)] disabled:opacity-50"
            style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
          />
        </div>
      </div>

      {/* ── Error + Actions ── */}
      <SettingsErrorBanner message={combinedError} />

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="h-9 rounded-lg border wd-border-subtle px-4 text-sm font-medium wd-text-secondary transition-all duration-150 hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: 'var(--wd-accent)' }}
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
