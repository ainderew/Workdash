import React, { useCallback, useRef, useState } from 'react';
import { Loader2, Music } from 'lucide-react';
import { useSoundboardUpload } from '@/common/components/Soundboard/hooks/useSoundboardUpload';

const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

interface SoundboardUploadFormProps {
  workspaceId: string;
  disabled?: boolean;
}

function SoundboardUploadForm({ workspaceId, disabled }: SoundboardUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [durationMs, setDurationMs] = useState(0);
  const [isPersonal, setIsPersonal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error, setError, clearError } = useSoundboardUpload(workspaceId);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Use MP3, WAV, OGG, or WebM.');
      return;
    }

    // Read duration via Web Audio API
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      const ms = Math.round(audio.duration * 1000);
      if (ms > 30000) {
        setError('Sound must be 30 seconds or less.');
        URL.revokeObjectURL(url);
        return;
      }
      setDurationMs(ms);
      URL.revokeObjectURL(url);
    });
    audio.addEventListener('error', () => {
      setError('Could not read audio file.');
      URL.revokeObjectURL(url);
    });

    setSelectedFile(file);

    // Auto-generate name from filename
    const baseName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 32);
    if (baseName.length >= 2) {
      setName(baseName);
    }
  }, [clearError, setError]);

  const handleUpload = async () => {
    if (!selectedFile || !name.trim() || durationMs <= 0) return;
    const result = await upload(selectedFile, name, durationMs, isPersonal);
    if (result) {
      setSelectedFile(null);
      setName('');
      setDurationMs(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
        Upload Sound
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="h-16 w-16 shrink-0 rounded-lg border-2 border-dashed wd-border-subtle flex items-center justify-center transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
        >
          {selectedFile ? (
            <span className="text-[10px] wd-text-primary text-center px-1 truncate">{selectedFile.name}</span>
          ) : (
            <Music size={20} className="wd-text-muted" />
          )}
        </button>

        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            placeholder="sound_name"
            maxLength={32}
            disabled={isUploading || disabled}
            className="h-8 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)] disabled:opacity-50"
          />
          <p className="text-[10px] wd-text-muted">
            2-32 chars, letters, numbers, underscores, hyphens
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPersonal(false)}
          className={`px-2.5 py-1 text-[10px] font-semibold rounded transition-colors ${
            !isPersonal
              ? 'bg-[var(--wd-accent-soft)] wd-text-primary'
              : 'wd-text-muted hover:wd-text-secondary'
          }`}
        >
          Shared
        </button>
        <button
          type="button"
          onClick={() => setIsPersonal(true)}
          className={`px-2.5 py-1 text-[10px] font-semibold rounded transition-colors ${
            isPersonal
              ? 'bg-[var(--wd-accent-soft)] wd-text-primary'
              : 'wd-text-muted hover:wd-text-secondary'
          }`}
        >
          Personal
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && (
        <p className="rounded-md border border-[rgb(var(--wd-danger-rgb)/0.35)] bg-[rgb(var(--wd-danger-rgb)/0.12)] px-3 py-2 text-xs wd-text-danger">
          {error}
        </p>
      )}

      {selectedFile && name.length >= 2 && durationMs > 0 && !disabled && (
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={isUploading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[rgb(var(--wd-accent-rgb)/0.6)] bg-[rgb(var(--wd-accent-rgb)/0.2)] px-3 py-2 text-xs font-semibold wd-text-primary transition-colors hover:bg-[rgb(var(--wd-accent-rgb)/0.3)] disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Sound'
          )}
        </button>
      )}

      <p className="text-[10px] wd-text-muted">
        MP3, WAV, OGG, or WebM. Max 2MB, 30 seconds.
      </p>
    </div>
  );
}

export default SoundboardUploadForm;
