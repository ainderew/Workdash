import React from 'react';
import { X } from 'lucide-react';
import { useObjectUrl } from './hooks/useObjectUrl';

interface AttachmentPreviewProps {
    file: File;
    onRemove: () => void;
}

export function AttachmentPreview({ file, onRemove }: AttachmentPreviewProps) {
    const isImage = file.type.startsWith('image/');
    const previewUrl = useObjectUrl(isImage ? file : null);

    return (
        <div className="mb-3 px-3 py-2 rounded-md wd-bg-elevated text-xs wd-text-secondary flex items-center gap-2 border wd-border-subtle">
            {previewUrl && (
                <img
                    src={previewUrl}
                    alt="Attachment preview"
                    className="h-10 w-10 rounded object-cover shrink-0"
                />
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
    );
}
