import React, { useCallback, useRef, useState } from 'react';
import { Loader2, Upload, FileAudio } from 'lucide-react';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error, setError, clearError } =
    useSoundboardUpload(workspaceId);

  const processFile = useCallback(
    (file: File) => {
      clearError();

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Invalid file type. Use MP3, WAV, OGG, or WebM.');
        return;
      }

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

      const baseName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 32);
      if (baseName.length >= 2) {
        setName(baseName);
      }
    },
    [clearError, setError],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

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

  const durationSec = durationMs > 0 ? (durationMs / 1000).toFixed(1) : null;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer ${
          isDragOver ? 'wd-dropzone-active' : ''
        } ${selectedFile ? '' : 'hover:bg-[color-mix(in_srgb,var(--wd-accent)_6%,transparent)]'}`}
        style={{
          borderColor: isDragOver
            ? 'var(--wd-accent)'
            : 'var(--wd-border-subtle)',
        }}
      >
        {selectedFile ? (
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--wd-accent-soft)' }}
            >
              <FileAudio size={18} className="wd-text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium wd-text-primary truncate">
                  {selectedFile.name}
                </span>
                {durationSec && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: 'var(--wd-accent-soft)',
                      color: 'var(--wd-text-primary)',
                    }}
                  >
                    {durationSec}s
                  </span>
                )}
              </div>

              {/* Name input */}
              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                }
                placeholder="sound_name"
                maxLength={32}
                disabled={isUploading || disabled}
                className="h-8 w-full rounded-md border px-3 text-sm wd-text-primary outline-none disabled:opacity-50"
                style={{
                  borderColor: 'var(--wd-border-subtle)',
                  backgroundColor: 'var(--wd-surface-elevated)',
                }}
              />

              {/* Scope toggle + upload button */}
              <div className="flex items-center gap-2">
                <div
                  className="flex p-[3px] rounded-md"
                  style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                >
                  <button
                    type="button"
                    onClick={() => setIsPersonal(false)}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded transition-colors"
                    style={{
                      backgroundColor: !isPersonal
                        ? 'var(--wd-accent-soft)'
                        : 'transparent',
                      color: !isPersonal
                        ? 'var(--wd-text-primary)'
                        : 'var(--wd-text-muted)',
                    }}
                  >
                    Shared
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPersonal(true)}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded transition-colors"
                    style={{
                      backgroundColor: isPersonal
                        ? 'var(--wd-accent-soft)'
                        : 'transparent',
                      color: isPersonal
                        ? 'var(--wd-text-primary)'
                        : 'var(--wd-text-muted)',
                    }}
                  >
                    Personal
                  </button>
                </div>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setName('');
                    setDurationMs(0);
                    clearError();
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-2 py-1 text-[10px] font-medium wd-text-muted hover:wd-text-primary transition-colors rounded"
                >
                  Clear
                </button>

                {name.length >= 2 && durationMs > 0 && !disabled && (
                  <button
                    type="button"
                    onClick={() => void handleUpload()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--wd-accent)',
                      color: 'white',
                    }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Uploading
                      </>
                    ) : (
                      'Upload'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
            >
              <Upload size={16} className="wd-text-muted" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium wd-text-primary">
                Drop an audio file or click to browse
              </p>
              <p className="text-[10px] wd-text-muted mt-0.5">
                MP3, WAV, OGG, or WebM &middot; Max 2MB &middot; 30s
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && (
        <p
          className="rounded-md border px-3 py-2 text-xs"
          style={{
            borderColor: 'rgb(var(--wd-danger-rgb) / 0.35)',
            backgroundColor: 'rgb(var(--wd-danger-rgb) / 0.08)',
            color: 'var(--wd-danger)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default SoundboardUploadForm;
