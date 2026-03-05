import React, { useRef } from 'react';
import { Check, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react';
import type { BannerConfig } from '@/communication/chatV2/_types';
import {
  BANNER_SOLID_PRESETS,
  BANNER_GRADIENT_PRESETS,
} from './constants';

interface ProfileBannerEditorProps {
  preview: BannerConfig;
  isSaving: boolean;
  onSelectSolid: (color: string) => void;
  onSelectGradient: (gradient: string) => void;
  onSelectImageFile: (file: File) => void;
  onClearBanner: () => void;
  onApply: () => void;
  onCancel: () => void;
}

function isSelectedSolid(preview: BannerConfig, color: string) {
  return preview?.type === 'solid' && preview.color === color;
}

function isSelectedGradient(preview: BannerConfig, gradient: string) {
  return preview?.type === 'gradient' && preview.gradient === gradient;
}

export function ProfileBannerEditor({
  preview,
  isSaving,
  onSelectSolid,
  onSelectGradient,
  onSelectImageFile,
  onClearBanner,
  onApply,
  onCancel,
}: ProfileBannerEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-3 py-2.5 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
          Banner Style
        </p>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Close banner editor"
          className="h-5 w-5 rounded inline-flex items-center justify-center wd-text-muted transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-50"
        >
          <X size={12} />
        </button>
      </div>

      {/* Colors — single row of 8 */}
      <div>
        <p className="text-[10px] font-medium wd-text-secondary mb-1">
          Colors
        </p>
        <div className="flex gap-1.5">
          {BANNER_SOLID_PRESETS.map((preset) => (
            <button
              key={preset.color}
              type="button"
              onClick={() => onSelectSolid(preset.color)}
              disabled={isSaving}
              aria-label={preset.label}
              aria-selected={isSelectedSolid(preview, preset.color)}
              className="h-7 w-7 rounded-md border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                backgroundColor: preset.color,
                borderColor: isSelectedSolid(preview, preset.color)
                  ? 'var(--wd-accent)'
                  : 'transparent',
              }}
            >
              {isSelectedSolid(preview, preset.color) && (
                <Check
                  size={12}
                  className="mx-auto text-white drop-shadow"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Gradients — single row of 6 */}
      <div>
        <p className="text-[10px] font-medium wd-text-secondary mb-1">
          Gradients
        </p>
        <div className="flex gap-1.5">
          {BANNER_GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSelectGradient(preset.gradient)}
              disabled={isSaving}
              aria-label={preset.label}
              aria-selected={isSelectedGradient(preview, preset.gradient)}
              className="h-7 w-10 rounded-md border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: preset.gradient,
                borderColor: isSelectedGradient(preview, preset.gradient)
                  ? 'var(--wd-accent)'
                  : 'transparent',
              }}
            >
              {isSelectedGradient(preview, preset.gradient) && (
                <Check
                  size={12}
                  className="mx-auto text-white drop-shadow"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Image upload + actions — compact single row */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            className="inline-flex items-center gap-1 rounded-md border wd-border-subtle px-2 py-1 text-[11px] font-medium wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
          >
            <ImagePlus size={11} />
            Upload
          </button>
          {preview !== null && (
            <button
              type="button"
              onClick={onClearBanner}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium wd-text-muted transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="h-6 px-2.5 rounded-md border wd-border-subtle text-[11px] font-medium wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isSaving}
            className="h-6 px-2.5 rounded-md bg-[var(--wd-accent)] text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors hover:bg-[var(--wd-accent-hover)] disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 size={10} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectImageFile(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
    </div>
  );
}
