import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatV2UserProfile } from '@/communication/chatV2/_types';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';

const POPOVER_SELECTORS = [
  '[data-user-profile-popover="true"]',
  '[data-user-profile-more="true"]',
] as const;

export function useProfilePopover(
  senderUserId: number | null,
  onClose: () => void,
) {
  const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
  const [profile, setProfile] = useState<ChatV2UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data
  useEffect(() => {
    if (!senderUserId) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await chatV2Service.getUserProfile(senderUserId);
        if (cancelled) return;
        setProfile(result);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setIsLoading(false);
        setProfile(null);
        setError(
          err instanceof Error ? err.message : 'Failed to load user profile',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatV2Service, senderUserId]);

  // Dismiss on outside click, escape, scroll, resize
  const stableOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!senderUserId) return undefined;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      for (const selector of POPOVER_SELECTORS) {
        if (target?.closest(selector)) return;
      }
      stableOnClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stableOnClose();
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', stableOnClose, true);
    window.addEventListener('resize', stableOnClose);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', stableOnClose, true);
      window.removeEventListener('resize', stableOnClose);
    };
  }, [senderUserId, stableOnClose]);

  return { profile, setProfile, isLoading, error };
}
