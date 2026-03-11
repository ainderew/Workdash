import React from 'react';
import { Loader2 } from 'lucide-react';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import type { CustomEmoji } from '@/common/store/customEmojiStore';
import EmojiUploadForm from './EmojiUploadForm';
import EmojiListItem from './EmojiListItem';

const EMPTY: CustomEmoji[] = [];

interface EmojisTabProps {
  workspaceId: string;
  canManage: boolean;
}

function EmojisTab({ workspaceId, canManage }: EmojisTabProps) {
  const emojis = useCustomEmojiStore(
    (s) => s.emojisByWorkspace[workspaceId] ?? EMPTY,
  );
  const isLoading = useCustomEmojiStore((s) => s.loadingWorkspaces.has(workspaceId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin wd-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs wd-text-muted">
        {emojis.length} emoji{emojis.length !== 1 ? 's' : ''} uploaded
      </div>

      <EmojiUploadForm workspaceId={workspaceId} />

      {emojis.length > 0 && (
        <div className="rounded-lg border wd-border-subtle wd-bg-panel-2">
          <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
            Emoji List
          </p>
          <div className="max-h-64 overflow-y-auto p-1">
            {emojis.map((emoji) => (
              <EmojiListItem
                key={emoji.id}
                emoji={emoji}
                workspaceId={workspaceId}
                canManage={canManage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmojisTab;
