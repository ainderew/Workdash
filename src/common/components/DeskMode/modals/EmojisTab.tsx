import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import type { CustomEmoji } from '@/common/store/customEmojiStore';
import useUserStore from '@/common/store/useStore';
import EmojiUploadForm from './EmojiUploadForm';
import EmojiListItem from './EmojiListItem';

const EMPTY: CustomEmoji[] = [];
const MEMBER_EMOJI_LIMIT = 10;

interface EmojisTabProps {
  workspaceId: string;
  canManage: boolean;
}

function EmojisTab({ workspaceId, canManage }: EmojisTabProps) {
  const emojis = useCustomEmojiStore(
    (s) => s.emojisByWorkspace[workspaceId] ?? EMPTY,
  );
  const isLoading = useCustomEmojiStore((s) => s.loadingWorkspaces.has(workspaceId));
  const viewerUserId = useUserStore((s) => s.backendUser?.id ?? 0);

  const viewerUploadCount = useMemo(
    () => emojis.filter((e) => e.uploadedBy === viewerUserId).length,
    [emojis, viewerUserId],
  );

  const uploadLimit = canManage ? null : MEMBER_EMOJI_LIMIT;
  const isAtLimit = uploadLimit !== null && viewerUploadCount >= uploadLimit;

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
        {uploadLimit !== null && (
          <span className="ml-1">
            &middot; You: {viewerUploadCount}/{uploadLimit}
          </span>
        )}
      </div>

      <EmojiUploadForm workspaceId={workspaceId} disabled={isAtLimit} />
      {isAtLimit && (
        <p className="text-[10px] wd-text-muted">
          You&apos;ve reached your limit of {uploadLimit} emoji uploads. Contact an admin to upload more.
        </p>
      )}

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
