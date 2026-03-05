import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { BannerConfig } from '@/communication/chatV2/_types';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import { CONFIG } from '@/common/utils/config';

export function useBannerEditor(
  currentBanner: BannerConfig | undefined,
  onBannerSaved: (banner: BannerConfig) => void,
) {
  const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState<BannerConfig>(
    currentBanner ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    null,
  );

  const openEditor = () => {
    setPreview(currentBanner ?? null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setIsEditing(true);
  };

  const closeEditor = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setIsEditing(false);
  };

  const selectSolid = (color: string) => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setPreview({ type: 'solid', color });
  };

  const selectGradient = (gradient: string) => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setPreview({ type: 'gradient', gradient });
  };

  const selectImageFile = (file: File) => {
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

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreviewUrl(url);
    setPreview({ type: 'image', url });
  };

  const clearBanner = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setPreview(null);
  };

  const applyBanner = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      if (imageFile) {
        // Image upload requires FormData — only endpoint that uses direct fetch
        const jwt = window.__BACKEND_JWT__;
        if (!jwt) {
          toast('Not authenticated');
          return;
        }
        const formData = new FormData();
        formData.append('image', imageFile);
        const response = await fetch(
          `${CONFIG.SFU_SERVER_URL}/api/users/me/banner`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${jwt}` },
            body: formData,
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            body?.error || `Upload failed: ${response.status}`,
          );
        }
        onBannerSaved(body.banner);
      } else {
        // Solid, gradient, or reset (null) — use existing profile update
        const updated = await chatV2Service.updateOwnUserProfile({
          banner: preview,
        });
        onBannerSaved(updated.user.banner ?? null);
      }

      toast('Banner updated');
      closeEditor();
    } catch (err) {
      toast('Failed to update banner', {
        description:
          err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const displayBanner: BannerConfig = isEditing
    ? preview
    : (currentBanner ?? null);

  return {
    isEditing,
    preview,
    displayBanner,
    isSaving,
    openEditor,
    closeEditor,
    selectSolid,
    selectGradient,
    selectImageFile,
    clearBanner,
    applyBanner,
  };
}
