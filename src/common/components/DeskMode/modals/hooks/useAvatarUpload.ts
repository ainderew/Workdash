import { useCallback, useEffect, useRef, useState } from 'react';
import useUserStore from '@/common/store/useStore';
import { CONFIG } from '@/common/utils/config';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

export function useAvatarUpload() {
  const updateUser = useUserStore((state) => state.updateUser);
  const currentImage = useUserStore((state) => state.user.image);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = event.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        setError('Invalid file type. Allowed: PNG, JPEG, WebP, GIF');
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        setError('File size exceeds 5MB limit');
        return;
      }

      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    },
    [avatarPreview],
  );

  const handleUpload = useCallback(async (): Promise<string | null> => {
    if (!avatarFile) return null;

    const jwt = window.__BACKEND_JWT__;
    if (!jwt) throw new Error('Not authenticated');

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', avatarFile);

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
        throw new Error(
          body?.error || `Avatar upload failed: ${response.status}`,
        );
      }

      const avatarUrl: string = body.avatarUrl;
      updateUser({ image: avatarUrl });
      if (window.__BACKEND_USER__) {
        window.__BACKEND_USER__ = {
          ...window.__BACKEND_USER__,
          image: avatarUrl,
        };
      }

      setAvatarFile(null);
      setAvatarPreview(null);
      return avatarUrl;
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Failed to upload avatar',
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [avatarFile, updateUser]);

  const handleDelete = useCallback(async () => {
    const jwt = window.__BACKEND_JWT__;
    if (!jwt) {
      setError('Not authenticated');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/users/me/avatar`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${jwt}` },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Delete failed: ${response.status}`);
      }

      updateUser({ image: undefined });
      if (window.__BACKEND_USER__) {
        window.__BACKEND_USER__ = {
          ...window.__BACKEND_USER__,
          image: undefined,
        };
      }
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to remove avatar',
      );
    } finally {
      setIsDeleting(false);
    }
  }, [updateUser]);

  const clearSelection = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return {
    currentImage,
    avatarPreview,
    hasNewAvatar: !!avatarFile,
    isUploading,
    isDeleting,
    error,
    fileInputRef,
    handleFileSelect,
    handleUpload,
    handleDelete,
    clearSelection,
  };
}
