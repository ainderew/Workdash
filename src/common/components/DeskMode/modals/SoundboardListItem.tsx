import React, { useCallback, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';
import useSoundboardStore from '@/common/store/soundboardStore';
import type { SoundboardSound } from '@/common/components/Soundboard/_types';

interface SoundboardListItemProps {
  sound: SoundboardSound;
  workspaceId: string;
  canManage: boolean;
}

function SoundboardListItem({ sound, workspaceId, canManage }: SoundboardListItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeSound = useSoundboardStore((s) => s.removeSound);

  const durationSec = Math.ceil(sound.durationMs / 1000);

  const handleDelete = useCallback(async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const jwt = tokenStore.getJwt();
      if (!jwt) throw new Error('Not authenticated');
      const res = await fetch(
        `${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/soundboard/${sound.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${jwt}` },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Delete failed');
      }
      removeSound(sound.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setIsDeleting(false);
    }
  }, [sound.id, workspaceId, removeSound]);

  return (
    <div className="flex items-center gap-3 rounded-md px-2.5 py-2 group hover:bg-[var(--wd-surface-elevated)]">
      <span className="flex-1 text-sm wd-text-primary truncate">{sound.name}</span>
      <span className="text-[10px] wd-text-muted shrink-0">{durationSec}s</span>

      {canManage && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="rounded px-2 py-1 text-[10px] font-semibold wd-text-danger bg-[rgb(var(--wd-danger-rgb)/0.1)] hover:bg-[rgb(var(--wd-danger-rgb)/0.2)] disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
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

export default React.memo(SoundboardListItem);
