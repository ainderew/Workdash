import React, { useMemo } from 'react';
import { Pencil, Save } from 'lucide-react';
import { parseMessageContent } from '@/common/utils/linkParser';
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
    <div className="rounded-lg wd-neo p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest wd-text-muted">
          About
        </p>
        {isSelf && !isBioEditing && (
          <button
            type="button"
            onClick={onStartEdit}
            className="text-[11px] wd-text-muted inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-all duration-150 hover:wd-text-primary hover:bg-white/[0.06]"
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
            className="w-full rounded-md border border-white/[0.06] wd-bg-elevated p-2.5 text-[13px] leading-relaxed wd-text-primary outline-none transition-colors duration-150 focus:border-[var(--wd-accent)]/40"
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
        <BioText
          bio={bio}
          fallback={
            isSelf
              ? 'Set your bio to help others know you.'
              : 'No bio set yet.'
          }
        />
      )}
    </div>
  );
}

function BioText({ bio, fallback }: { bio: string | null; fallback: string }) {
  const trimmed = bio?.trim();
  const parts = useMemo(
    () => (trimmed ? parseMessageContent(trimmed) : null),
    [trimmed],
  );

  if (!parts) {
    return (
      <p className="text-[13px] leading-relaxed wd-text-secondary whitespace-pre-wrap break-words">
        {fallback}
      </p>
    );
  }

  return (
    <p className="text-[13px] leading-relaxed wd-text-secondary whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.url ? (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--wd-accent)] hover:underline"
          >
            {part.content}
          </a>
        ) : (
          <React.Fragment key={i}>{part.content}</React.Fragment>
        ),
      )}
    </p>
  );
}
