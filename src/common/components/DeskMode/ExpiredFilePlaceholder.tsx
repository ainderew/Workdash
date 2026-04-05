import React from 'react';
import { Clock } from 'lucide-react';
import { FileTypeIcon } from './FileTypeIcon';

interface ExpiredFilePlaceholderProps {
  filename: string;
  mimeType: string;
}

export function ExpiredFilePlaceholder({
  filename,
  mimeType,
}: ExpiredFilePlaceholderProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--wd-surface-elevated)] border border-[var(--wd-border-subtle)] max-w-sm w-full opacity-60">
      <div className="shrink-0 text-[var(--wd-text-muted)]">
        <FileTypeIcon mimeType={mimeType} filename={filename} size={28} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--wd-text-secondary)] truncate">
          {filename}
        </p>
        <p className="text-xs text-[var(--wd-text-muted)] flex items-center gap-1">
          <Clock size={12} />
          This file has expired
        </p>
      </div>
    </div>
  );
}
