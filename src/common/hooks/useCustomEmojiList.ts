import { useEffect, useRef } from 'react';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import { MediaTransportService } from '@/communication/mediaTransportService/mediaTransportServive';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import type { CustomEmoji } from '@/common/store/customEmojiStore';

export function useCustomEmojiList(workspaceId: string | null) {
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const store = useCustomEmojiStore.getState();

    // Fetch on workspace change (avoid duplicate fetches)
    if (fetchedRef.current !== workspaceId) {
      fetchedRef.current = workspaceId;
      store.setLoading(workspaceId, true);

      const service = ChatV2Service.getInstance();
      service
        .listWorkspaceEmojis(workspaceId)
        .then((emojis) => {
          useCustomEmojiStore.getState().setEmojis(workspaceId, emojis);
        })
        .catch((err) => {
          console.error('[custom-emoji] Failed to fetch emojis', err);
        })
        .finally(() => {
          useCustomEmojiStore.getState().setLoading(workspaceId, false);
        });
    }

    // Wire up realtime listeners
    const transport = MediaTransportService.getInstance();
    const socket = transport.socket;

    const onCreated = (data: { emoji: CustomEmoji }) => {
      if (data?.emoji) useCustomEmojiStore.getState().addEmoji(data.emoji);
    };
    const onDeleted = (data: { emojiId: string; workspaceId: string }) => {
      if (data?.emojiId && data?.workspaceId) {
        useCustomEmojiStore.getState().removeEmoji(data.workspaceId, data.emojiId);
      }
    };
    const onRenamed = (data: { emoji: CustomEmoji }) => {
      if (data?.emoji) {
        useCustomEmojiStore.getState().renameEmoji(data.emoji.workspaceId, data.emoji.id, data.emoji.name);
      }
    };

    socket.on('workspace:emoji:created', onCreated);
    socket.on('workspace:emoji:deleted', onDeleted);
    socket.on('workspace:emoji:renamed', onRenamed);

    return () => {
      socket.off('workspace:emoji:created', onCreated);
      socket.off('workspace:emoji:deleted', onDeleted);
      socket.off('workspace:emoji:renamed', onRenamed);
    };
  }, [workspaceId]);
}
