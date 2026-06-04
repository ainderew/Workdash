/**
 * READ-ONLY mirror of workdash-media-server/src/config/gcs.config.ts.
 *
 * The backend is the security boundary. This frontend list exists solely so the
 * Composer can surface "unsupported file" feedback before the upload request
 * leaves the browser. If you change one file, change the other — the snapshot
 * test in uploadAllowlist.test.ts will fail if they drift.
 */

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  // Images
  'image/png',
  'image/jpeg',
  'image/webp',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-m4a',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Archives (canonical IANA)
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/vnd.rar',
  'application/x-7z-compressed',
  // Archive aliases — browsers report these; backend normalizes to canonical.
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-rar',
] as const;

export type AllowedUploadContentType =
  (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];

export const ALLOWED_UPLOAD_CONTENT_TYPE_SET: ReadonlySet<string> = new Set(
  ALLOWED_UPLOAD_CONTENT_TYPES,
);

/**
 * Maps a browser-reported alias to the canonical MIME the backend will store.
 * Mirrors CONTENT_TYPE_ALIASES in workdash-media-server/src/config/gcs.config.ts.
 */
export const UPLOAD_CONTENT_TYPE_ALIASES: Readonly<Record<string, string>> = {
  'application/x-zip-compressed': 'application/zip',
  'application/x-rar-compressed': 'application/vnd.rar',
  'application/x-rar': 'application/vnd.rar',
};
