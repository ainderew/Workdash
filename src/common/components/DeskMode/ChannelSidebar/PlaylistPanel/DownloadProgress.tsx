import React from 'react';
import { Search, ArrowDownToLine, Check, AlertCircle } from 'lucide-react';
import type { DownloadProgress as DownloadProgressType } from '@/common/store/playlistStore';

interface DownloadProgressProps {
  progress: DownloadProgressType;
}

const phaseConfig: Record<
  DownloadProgressType['phase'],
  { icon: React.ReactNode; label: string; color: string }
> = {
  resolving: {
    icon: <Search size={12} />,
    label: 'Resolving...',
    color: 'text-[var(--wd-info)]',
  },
  downloading: {
    icon: <ArrowDownToLine size={12} />,
    label: 'Downloading',
    color: 'text-[var(--wd-accent)]',
  },
  complete: {
    icon: <Check size={12} />,
    label: 'Ready!',
    color: 'text-[var(--wd-success)]',
  },
  error: {
    icon: <AlertCircle size={12} />,
    label: 'Error',
    color: 'text-[var(--wd-danger)]',
  },
};

export function DownloadProgress({ progress }: DownloadProgressProps) {
  const config = phaseConfig[progress.phase];

  return (
    <div className="px-3.5 py-2.5 border-b wd-border-subtle bg-[var(--wd-surface-elevated)]">
      <div className="flex items-center gap-2.5 text-[13px]">
        <span className={`shrink-0 ${config.color} ${progress.phase === 'downloading' ? 'wd-playlist-progress-glow' : ''}`}>
          {config.icon}
        </span>
        <span className="flex-1 min-w-0 truncate wd-text-secondary font-medium">
          {progress.trackTitle}
        </span>
        <span className={`shrink-0 text-[11px] font-semibold ${config.color}`}>
          {config.label}
          {progress.phase === 'downloading' && ` ${progress.percent}%`}
        </span>
      </div>
      {progress.phase === 'downloading' && (
        <div className="mt-2 h-1 w-full rounded-full bg-[var(--wd-surface-base)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--wd-accent)] transition-[width] duration-300 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}
      {progress.error && (
        <p className="mt-1.5 text-[11px] text-[var(--wd-danger)]">
          {progress.error}
        </p>
      )}
    </div>
  );
}
