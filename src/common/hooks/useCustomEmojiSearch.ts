import { useMemo } from 'react';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import type { CustomEmoji } from '@/common/store/customEmojiStore';

const EMPTY: CustomEmoji[] = [];

export function useCustomEmojiSearch(
  workspaceId: string | null,
  query: string,
): CustomEmoji[] {
  const emojis = useCustomEmojiStore(
    (s) => (workspaceId ? s.emojisByWorkspace[workspaceId] : undefined) ?? EMPTY,
  );

  return useMemo(() => {
    if (!query || query.length < 2) return EMPTY;
    const lower = query.toLowerCase();
    return emojis.filter((e) => e.name.includes(lower));
  }, [emojis, query]);
}
