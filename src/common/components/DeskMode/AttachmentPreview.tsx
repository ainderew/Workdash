import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useObjectUrl } from './hooks/useObjectUrl';
import { FileTypeIcon } from './FileTypeIcon';
import ImagePreviewLightbox from './ImagePreviewLightbox';

interface AttachmentPreviewProps {
    file: File;
    onRemove: () => void;
}

export function AttachmentPreview({ file, onRemove }: AttachmentPreviewProps) {
    const isImage = file.type.startsWith('image/');
    const previewUrl = useObjectUrl(isImage ? file : null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    return (
        <>
            <div className="mb-3 px-3 py-2 rounded-md wd-bg-elevated text-xs wd-text-secondary flex items-center gap-2 border wd-border-subtle">
                {previewUrl ? (
                    <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
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
                <span className="truncate flex-1">{file.name}</span>
                <button
                    type="button"
                    className="wd-text-muted hover:text-[var(--wd-text-primary)] shrink-0"
                    onClick={onRemove}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            {isLightboxOpen && previewUrl && (
                <ImagePreviewLightbox
                    onClose={() => setIsLightboxOpen(false)}
                    current={{
                        fileId: '',
                        imageUrl: previewUrl,
                        fileName: file.name,
                    }}
                />
            )}
        </>
    );
}
