import React, { useCallback, useState } from 'react';
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import type { CustomEmoji } from '@/common/store/customEmojiStore';

interface EmojiListItemProps {
  emoji: CustomEmoji;
  workspaceId: string;
  canManage: boolean;
}

function EmojiListItem({ emoji, workspaceId, canManage }: EmojiListItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(emoji.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeEmoji = useCustomEmojiStore((s) => s.removeEmoji);
  const renameEmoji = useCustomEmojiStore((s) => s.renameEmoji);

  const handleRename = useCallback(async () => {
    const trimmed = newName.trim().toLowerCase();
    if (!trimmed || trimmed === emoji.name) {
      setIsRenaming(false);
      return;
    }
    setError(null);
    try {
      const jwt = tokenStore.getJwt();
      if (!jwt) throw new Error('Not authenticated');
      const res = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/emojis/${emoji.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Rename failed');
      renameEmoji(workspaceId, emoji.id, trimmed);
      setIsRenaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  }, [emoji.id, emoji.name, newName, workspaceId, renameEmoji]);

  const handleDelete = useCallback(async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const jwt = tokenStore.getJwt();
      if (!jwt) throw new Error('Not authenticated');
      const res = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/emojis/${emoji.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${jwt}` },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Delete failed');
      }
      removeEmoji(workspaceId, emoji.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setIsDeleting(false);
    }
  }, [emoji.id, workspaceId, removeEmoji]);

  const isBusy = isDeleting;

  return (
    <div className="flex items-center gap-3 rounded-md px-2.5 py-2 group hover:bg-[var(--wd-surface-elevated)]">
      <img
        src={emoji.imageUrl}
        alt={`:${emoji.name}:`}
        className="h-8 w-8 shrink-0 object-contain"
        loading="lazy"
      />

      {isRenaming ? (
        <div className="flex flex-1 items-center gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            maxLength={32}
            autoFocus
            className="h-7 flex-1 rounded-md border wd-border-subtle wd-bg-elevated px-2 text-xs wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRename();
              if (e.key === 'Escape') { setIsRenaming(false); setNewName(emoji.name); }
            }}
          />
          <button
            type="button"
            onClick={() => void handleRename()}
            className="rounded p-1 text-[var(--wd-success)] hover:bg-[rgba(87,242,135,0.1)]"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => { setIsRenaming(false); setNewName(emoji.name); }}
            className="rounded p-1 wd-text-muted hover:wd-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <span className="flex-1 text-sm wd-text-primary truncate">
          :{emoji.name}:
        </span>
      )}

      {canManage && !isRenaming && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => { setIsRenaming(true); setNewName(emoji.name); setConfirmDelete(false); }}
            disabled={isBusy}
            className="rounded p-1 wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
            title="Rename"
          >
            <Pencil size={14} />
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isBusy}
              className="rounded px-2 py-1 text-[10px] font-semibold wd-text-danger bg-[rgb(var(--wd-danger-rgb)/0.1)] hover:bg-[rgb(var(--wd-danger-rgb)/0.2)] disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isBusy}
              className="rounded p-1 wd-text-danger hover:bg-[rgb(var(--wd-danger-rgb)/0.1)] disabled:opacity-50"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {error && (
        <span className="text-[10px] wd-text-danger">{error}</span>
      )}
    </div>
  );
}

export default React.memo(EmojiListItem);
