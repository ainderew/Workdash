import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useUserStore from '@/common/store/useStore';
import { CharacterEventBus } from '@/game/character/CharacterEventBus';
import { getDisplayNameFromParts } from '@/common/utils/displayName';

const MAX_NAME_LENGTH = 20;
const MAX_NICKNAME_LENGTH = 20;

export function useProfileForm(isOpen: boolean) {
  const { data: session } = useSession();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const resolvedName =
      user.name?.trim() ||
      session?.backendUser?.name?.trim() ||
      session?.user?.name?.trim() ||
      '';
    const resolvedNickname =
      user.nickname?.trim() ||
      session?.backendUser?.nickname?.trim() ||
      '';

    setName(resolvedName);
    setNickname(resolvedNickname);
    setError(null);
  }, [
    isOpen,
    session?.backendUser?.name,
    session?.backendUser?.nickname,
    session?.user?.name,
    user.name,
    user.nickname,
  ]);

  const previewName = useMemo(
    () => getDisplayNameFromParts(nickname, name, 'You'),
    [name, nickname],
  );

  const handleSave = useCallback(
    async (onAvatarUpload?: () => Promise<void>) => {
      const normalizedName = name.trim();
      const normalizedNickname = nickname.trim();

      if (!normalizedName) {
        setError('Full name cannot be empty.');
        return false;
      }

      if (normalizedName.length > MAX_NAME_LENGTH) {
        setError(`Full name must be ${MAX_NAME_LENGTH} characters or fewer.`);
        return false;
      }

      if (normalizedNickname.length > MAX_NICKNAME_LENGTH) {
        setError(
          `Nickname must be ${MAX_NICKNAME_LENGTH} characters or fewer.`,
        );
        return false;
      }

      if (!session?.backendJwt) {
        setError('You must be logged in to update your settings.');
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        // Upload avatar first if provided
        if (onAvatarUpload) {
          await onAvatarUpload();
        }

        const response = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: normalizedName,
            nickname:
              normalizedNickname.length > 0 ? normalizedNickname : null,
          }),
        });

        const responseBody = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            responseBody?.error || `Server error: ${response.status}`,
          );
        }

        const updatedUser = responseBody?.user ?? responseBody;
        const updatedName =
          typeof updatedUser?.name === 'string'
            ? updatedUser.name.trim()
            : normalizedName;
        const updatedNickname =
          typeof updatedUser?.nickname === 'string'
            ? updatedUser.nickname.trim()
            : updatedUser?.nickname === null
              ? null
              : normalizedNickname.length > 0
                ? normalizedNickname
                : null;

        updateUser({ name: updatedName, nickname: updatedNickname });

        if (window.__BACKEND_USER__) {
          window.__BACKEND_USER__ = {
            ...window.__BACKEND_USER__,
            name: updatedName,
            nickname: updatedNickname,
          };
        }

        const effectiveDisplayName = getDisplayNameFromParts(
          updatedNickname,
          updatedName,
          updatedName,
        );
        CharacterEventBus.emitNameUpdate(effectiveDisplayName);

        const multiplayer = window.__MULTIPLAYER__;
        if (multiplayer && typeof multiplayer.emitNameUpdate === 'function') {
          multiplayer.emitNameUpdate(updatedName, updatedNickname);
        }

        return true;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : 'Failed to update user settings',
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [name, nickname, session?.backendJwt, updateUser],
  );

  const resetForm = useCallback(() => {
    setName('');
    setNickname('');
    setError(null);
  }, []);

  return {
    name,
    setName,
    nickname,
    setNickname,
    previewName,
    isSaving,
    error,
    setError,
    handleSave,
    resetForm,
  };
}
