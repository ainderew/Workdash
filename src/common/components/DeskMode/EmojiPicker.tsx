'use client';

import React, { useEffect, useRef, useState } from 'react';

type EmojiPickerProps = {
    onSelect: (emoji: string) => void;
    onClose?: () => void;
};

function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mountRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    const onSelectRef = useRef(onSelect);
    const onCloseRef = useRef(onClose);
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onCloseRef.current?.();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCloseRef.current?.();
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const [{ default: data }, { Picker }] = await Promise.all([
                import('@emoji-mart/data'),
                import('emoji-mart'),
            ]);

            if (cancelled || !mountRef.current) return;

            const picker = new (Picker as unknown as new (props: Record<string, unknown>) => HTMLElement)({
                data,
                set: 'native',
                theme: 'dark',
                maxFrequentRows: 0,
                searchPosition: 'sticky',
                navPosition: 'top',
                previewPosition: 'none',
                perLine: 8,
                emojiSize: 28,
                emojiButtonSize: 36,
                skinTonePosition: 'search',
                onEmojiSelect: (emojiData: { native: string }) => {
                    onSelectRef.current(emojiData.native);
                },
            });

            if (!cancelled && mountRef.current) {
                mountRef.current.appendChild(picker);
                setLoaded(true);
            }
        };

        void load();

        return () => {
            cancelled = true;
            if (mountRef.current) {
                mountRef.current.innerHTML = '';
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="emoji-picker-container"
            style={{
                ['--em-rgb-background' as string]: 'var(--wd-panel-rgb, 30 30 36)',
                ['--em-rgb-input' as string]: 'var(--wd-elevated-rgb, 42 42 50)',
                ['--em-rgb-color' as string]: 'var(--wd-text-primary-rgb, 220 220 230)',
                ['--em-color-border' as string]: 'var(--wd-border-subtle, rgba(255,255,255,0.08))',
                ['--em-color-border-over' as string]: 'var(--wd-border-strong, rgba(255,255,255,0.14))',
            }}
        >
            {!loaded && (
                <div className="flex h-[350px] w-[352px] items-center justify-center rounded-xl border wd-border-strong wd-bg-panel">
                    <span className="text-xs wd-text-muted">Loading emoji...</span>
                </div>
            )}
            <div ref={mountRef} />
        </div>
    );
}

export default EmojiPicker;
