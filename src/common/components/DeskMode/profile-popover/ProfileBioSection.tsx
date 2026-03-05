import React from 'react';
import { Pencil, Save } from 'lucide-react';
import { MAX_BIO_LENGTH } from './constants';

interface ProfileBioSectionProps {
  bio: string | null;
  isSelf: boolean;
  bioDraft: string;
  isBioEditing: boolean;
  isSavingBio: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onBioChange: (value: string) => void;
  onSaveBio: () => void;
}

export function ProfileBioSection({
  bio,
  isSelf,
  bioDraft,
  isBioEditing,
  isSavingBio,
  onStartEdit,
  onCancelEdit,
  onBioChange,
  onSaveBio,
}: ProfileBioSectionProps) {
  return (
    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide wd-text-muted">
          Bio
        </p>
        {isSelf && !isBioEditing && (
          <button
            type="button"
            onClick={onStartEdit}
            className="text-xs wd-text-secondary inline-flex items-center gap-1 hover:wd-text-primary"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>

      {isSelf && isBioEditing ? (
        <div className="space-y-2">
          <textarea
            value={bioDraft}
            onChange={(e) => onBioChange(e.target.value)}
            rows={4}
            placeholder="Write a short bio..."
            className="w-full rounded-md border wd-border-subtle wd-bg-elevated p-2 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] wd-text-muted">
              {bioDraft.length}/{MAX_BIO_LENGTH}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="h-7 px-2 rounded-md border wd-border-subtle wd-bg-elevated text-xs wd-text-secondary transition-colors hover:wd-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveBio}
                disabled={isSavingBio}
                className="h-7 px-2 rounded-md bg-[var(--wd-accent)] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors hover:bg-[var(--wd-accent-hover)] disabled:opacity-70"
              >
                <Save size={12} />
                {isSavingBio ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm wd-text-secondary whitespace-pre-wrap break-words">
          {bio?.trim() ||
            (isSelf
              ? 'Set your bio to help others know you.'
              : 'No bio set yet.')}
        </p>
      )}
    </div>
  );
}
