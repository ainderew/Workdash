import React from 'react';
import { Download } from 'lucide-react';
import { FileTypeIcon } from './FileTypeIcon';
import { formatFileSize } from '@/communication/chatV2/fileCategories';

interface FileDownloadCardProps {
  filename: string;
  mimeType: string;
  sizeBytes: string;
  onDownload: () => void;
}

export function FileDownloadCard({
  filename,
  mimeType,
  sizeBytes,
  onDownload,
}: FileDownloadCardProps) {
  return (
    <button
      type="button"
      onClick={onDownload}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--wd-surface-elevated)] border border-[var(--wd-border-subtle)] hover:border-[var(--wd-border-default)] transition-colors max-w-sm w-full text-left group"
    >
      <div className="shrink-0 text-[var(--wd-accent)]">
        <FileTypeIcon mimeType={mimeType} filename={filename} size={28} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--wd-text-primary)] truncate">
          {filename}
        </p>
        <p className="text-xs text-[var(--wd-text-muted)]">
          {formatFileSize(sizeBytes)}
        </p>
      </div>
      <div className="shrink-0 text-[var(--wd-text-muted)] group-hover:text-[var(--wd-accent)] transition-colors">
        <Download size={16} />
      </div>
    </button>
  );
}
