import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useObjectUrl } from './hooks/useObjectUrl';
import { FileTypeIcon } from './FileTypeIcon';
import ImagePreviewLightbox from './ImagePreviewLightbox';

interface AttachmentPreviewProps {
    files: File[];
    onRemoveAt: (index: number) => void;
}

interface AttachmentTileProps {
    file: File;
    onRemove: () => void;
    onPreview: (url: string) => void;
}

function AttachmentTile({ file, onRemove, onPreview }: AttachmentTileProps) {
    const isImage = file.type.startsWith('image/');
    const previewUrl = useObjectUrl(isImage ? file : null);

    return (
        <div className="relative group flex items-center gap-2 px-2.5 py-2 rounded-md wd-bg-elevated text-xs wd-text-secondary border wd-border-subtle min-w-0 max-w-[220px]">
            {previewUrl ? (
                <button
                    type="button"
                    onClick={() => onPreview(previewUrl)}
                    className="h-10 w-10 shrink-0 rounded overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wd-accent)]"
                    aria-label="Preview image"
                >
                    <img
                        src={previewUrl}
                        alt="Attachment preview"
                        className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-150 hover:scale-105"
                    />
                </button>
            ) : (
                <div className="h-10 w-10 rounded bg-[var(--wd-surface-panel)] flex items-center justify-center shrink-0 text-[var(--wd-text-muted)]">
                    <FileTypeIcon mimeType={file.type} filename={file.name} size={20} />
                </div>
            )}
            <span className="truncate flex-1 min-w-0">{file.name}</span>
            <button
                type="button"
                className="wd-text-muted hover:text-[var(--wd-text-primary)] shrink-0"
                onClick={onRemove}
                aria-label={`Remove ${file.name}`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export function AttachmentPreview({ files, onRemoveAt }: AttachmentPreviewProps) {
    const [lightboxState, setLightboxState] = useState<{
        url: string;
        name: string;
    } | null>(null);

    if (files.length === 0) return null;

    return (
        <>
            <div className="mb-3 flex flex-wrap gap-2">
                {files.map((file, index) => (
                    <AttachmentTile
                        key={`${file.name}-${index}`}
                        file={file}
                        onRemove={() => onRemoveAt(index)}
                        onPreview={(url) => setLightboxState({ url, name: file.name })}
                    />
                ))}
            </div>
            {lightboxState && (
                <ImagePreviewLightbox
                    onClose={() => setLightboxState(null)}
                    current={{
                        fileId: '',
                        imageUrl: lightboxState.url,
                        fileName: lightboxState.name,
                    }}
                />
            )}
        </>
    );
}
