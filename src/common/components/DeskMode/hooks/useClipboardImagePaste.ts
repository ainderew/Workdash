import { useCallback } from 'react';

const MIME_TO_EXT: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

interface UseClipboardImagePasteOptions {
    onImagePaste: (file: File) => void;
}

export function useClipboardImagePaste({ onImagePaste }: UseClipboardImagePasteOptions) {
    const handlePaste = useCallback(
        (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item.type.startsWith('image/')) continue;

                event.preventDefault();
                const blob = item.getAsFile();
                if (!blob) return;

                const ext = MIME_TO_EXT[blob.type] ?? 'png';
                const file = new File([blob], `screenshot-${Date.now()}.${ext}`, {
                    type: blob.type,
                });
                onImagePaste(file);
                return;
            }
        },
        [onImagePaste],
    );

    return { handlePaste };
}
