import React, { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useCustomEmojiUpload } from '@/common/hooks/useCustomEmojiUpload';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

interface EmojiUploadFormProps {
  workspaceId: string;
}

function EmojiUploadForm({ workspaceId }: EmojiUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error, clearError } = useCustomEmojiUpload(workspaceId);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Auto-generate name from filename
    const baseName = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 32);
    if (baseName.length >= 2) {
      setName(baseName);
    }
  }, [clearError]);

  const handleUpload = async () => {
    if (!selectedFile || !name.trim()) return;
    const result = await upload(selectedFile, name);
    if (result) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
        Upload Emoji
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-16 w-16 shrink-0 rounded-lg border-2 border-dashed wd-border-subtle flex items-center justify-center transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="h-10 w-10 object-contain" />
          ) : (
            <ImagePlus size={20} className="wd-text-muted" />
          )}
        </button>

        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="emoji_name"
            maxLength={32}
            disabled={isUploading}
            className="h-8 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)] disabled:opacity-50"
          />
          <p className="text-[10px] wd-text-muted">
            2-32 chars, lowercase letters, numbers, underscores
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && (
        <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
          {error}
        </p>
      )}

      {selectedFile && name.length >= 2 && (
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={isUploading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[rgba(88,101,242,0.6)] bg-[rgba(88,101,242,0.2)] px-3 py-2 text-xs font-semibold wd-text-primary transition-colors hover:bg-[rgba(88,101,242,0.3)] disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Emoji'
          )}
        </button>
      )}

      <p className="text-[10px] wd-text-muted">
        PNG, JPEG, WebP, or GIF. Max 256KB. Will be resized to 128x128.
      </p>
    </div>
  );
}

export default EmojiUploadForm;
