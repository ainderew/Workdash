import { useCallback, useState } from 'react';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import type { CustomEmoji } from '@/common/store/customEmojiStore';

const MAX_EMOJI_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export function useCustomEmojiUpload(workspaceId: string | null) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addEmoji = useCustomEmojiStore((s) => s.addEmoji);

  const upload = useCallback(
    async (file: File, name: string): Promise<CustomEmoji | null> => {
      setError(null);

      if (!workspaceId) {
        setError('No workspace selected');
        return null;
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        setError('Invalid file type. Use PNG, JPEG, WebP, or GIF');
        return null;
      }

      if (file.size > MAX_EMOJI_SIZE) {
        setError('File size exceeds 2MB limit');
        return null;
      }

      const jwt = tokenStore.getJwt();
      if (!jwt) {
        setError('Not authenticated');
        return null;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('name', name.trim().toLowerCase());

        const response = await fetch(
          `${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/emojis`,
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

        const emoji = body.emoji as CustomEmoji;
        addEmoji(emoji);
        return emoji;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to upload emoji';
        setError(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, addEmoji],
  );

  return { upload, isUploading, error, setError, clearError: () => setError(null) };
}
