import { useCallback, useState } from 'react';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';
import useSoundboardStore from '@/common/store/soundboardStore';
import type { SoundboardSound } from '../_types';

const MAX_SOUND_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']);

export function useSoundboardUpload(workspaceId: string | null) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addSound = useSoundboardStore((s) => s.addSound);

  const upload = useCallback(
    async (file: File, name: string, durationMs: number, isPersonal: boolean): Promise<SoundboardSound | null> => {
      setError(null);

      if (!workspaceId) {
        setError('No workspace selected');
        return null;
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        setError('Invalid file type. Use MP3, WAV, OGG, or WebM');
        return null;
      }

      if (file.size > MAX_SOUND_SIZE) {
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
        formData.append('audio', file);
        formData.append('name', name.trim());
        formData.append('durationMs', String(Math.round(durationMs)));
        formData.append('isPersonal', String(isPersonal));

        const response = await fetch(
          `${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/soundboard`,
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

        const sound = body.sound as SoundboardSound;
        addSound(sound);
        return sound;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to upload sound';
        setError(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, addSound],
  );

  return { upload, isUploading, error, setError, clearError: () => setError(null) };
}
