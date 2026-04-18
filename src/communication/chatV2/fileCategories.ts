export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'unknown';

const MIME_CATEGORY_MAP: Record<string, FileCategory> = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/flac': 'audio',
  'audio/x-m4a': 'audio',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/csv': 'document',
  'application/zip': 'archive',
  'application/gzip': 'archive',
  'application/x-tar': 'archive',
  'application/vnd.rar': 'archive',
  'application/x-7z-compressed': 'archive',
};

export function getFileCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  return MIME_CATEGORY_MAP[mimeType] ?? 'unknown';
}

export function formatFileSize(bytes: number | string): string {
  const numBytes = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(numBytes) || numBytes < 0) return '0 B';
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
  if (numBytes < 1024 * 1024 * 1024) return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(numBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '';
  const totalSec = Math.round(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function getExpiryLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiring soon';
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days === 1) return 'Expires tomorrow';
  if (days <= 3) return `Expires in ${days} days`;
  return null;
}
