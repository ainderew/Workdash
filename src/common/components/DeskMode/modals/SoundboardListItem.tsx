import React, { useCallback, useState } from 'react';
import { Loader2, Trash2, FileAudio } from 'lucide-react';
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

  const durationSec = (sound.durationMs / 1000).toFixed(1);

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
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--wd-text-primary)_5%,transparent)]">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
      >
        <FileAudio size={14} className="wd-text-muted" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="block text-sm font-medium wd-text-primary truncate">
          {sound.name}
        </span>
      </div>

      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium wd-text-muted"
        style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
      >
        {durationSec}s
      </span>

      {canManage && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50"
              style={{
                color: 'var(--wd-danger)',
                backgroundColor: 'rgb(var(--wd-danger-rgb) / 0.1)',
              }}
            >
              {isDeleting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                'Confirm'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
              className="rounded-md p-1.5 transition-colors disabled:opacity-50 hover:bg-[rgb(var(--wd-danger-rgb)/0.1)]"
              style={{ color: 'var(--wd-danger)' }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {error && (
        <span className="text-[10px]" style={{ color: 'var(--wd-danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

export default React.memo(SoundboardListItem);
