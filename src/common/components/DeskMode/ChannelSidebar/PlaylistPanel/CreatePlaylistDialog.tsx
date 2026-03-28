import React, { useState } from 'react';
import DeskModalShell from '@/common/components/DeskMode/modals/DeskModalShell';
import type { PlaylistInfo } from '@/common/store/playlistStore';

interface CreatePlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'rename';
  existingPlaylist?: PlaylistInfo;
  onCreate: (name: string, type: 'PERSONAL' | 'WORKSPACE') => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}

export function CreatePlaylistDialog({
  open,
  onClose,
  mode,
  existingPlaylist,
  onCreate,
  onRename,
}: CreatePlaylistDialogProps) {
  const [name, setName] = useState(existingPlaylist?.name ?? '');
  const [type, setType] = useState<'PERSONAL' | 'WORKSPACE'>(
    existingPlaylist?.type ?? 'PERSONAL',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (trimmed.length > 100) {
      setError('Name must be 100 characters or less');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'create') {
        await onCreate(trimmed, type);
      } else if (existingPlaylist) {
        await onRename(existingPlaylist.id, trimmed);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'create' ? 'Create Playlist' : 'Rename Playlist';

  return (
    <DeskModalShell isOpen={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="playlist-name"
            className="block text-sm font-medium wd-text-secondary mb-1"
          >
            Name
          </label>
          <input
            id="playlist-name"
            type="text"
            autoFocus
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Playlist"
            className="w-full rounded-md border wd-border-subtle bg-[var(--wd-surface-base)] px-3 py-2 text-sm wd-text-primary placeholder:wd-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--wd-accent)]"
          />
          {error && (
            <p className="mt-1 text-xs text-[var(--wd-danger)]">{error}</p>
          )}
        </div>

        {mode === 'create' && (
          <div>
            <label className="block text-sm font-medium wd-text-secondary mb-1">
              Type
            </label>
            <div className="flex gap-2">
              {(['PERSONAL', 'WORKSPACE'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                    type === t
                      ? 'bg-[var(--wd-accent)] text-white'
                      : 'bg-[var(--wd-surface-base)] wd-text-secondary hover:wd-text-primary'
                  }`}
                >
                  {t === 'PERSONAL' ? 'Personal' : 'Shared'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="wd-btn-ghost h-10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="wd-btn-primary h-10"
          >
            {submitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Renaming...'
              : mode === 'create'
                ? 'Create'
                : 'Rename'}
          </button>
        </div>
      </form>
    </DeskModalShell>
  );
}
