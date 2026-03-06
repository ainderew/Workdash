'use client';

import React, { useEffect, useRef } from 'react';

type TwemojiSpanProps = {
    emoji: string;
    size?: number;
    className?: string;
};

let emojiMartReady: Promise<typeof import('emoji-mart')> | null = null;

function getEmojiMart() {
    if (emojiMartReady) return emojiMartReady;
    emojiMartReady = (async () => {
        const [{ default: data }, emojiMart] = await Promise.all([
            import('@emoji-mart/data'),
            import('emoji-mart'),
        ]);
        await emojiMart.init({ data });
        return emojiMart;
    })();
    return emojiMartReady;
}

function TwemojiSpan({ emoji, size = 18, className }: TwemojiSpanProps) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        let cancelled = false;

        void getEmojiMart().then(({ Emoji }) => {
            if (cancelled || !ref.current) return;
            const el = new (Emoji as unknown as new (props: Record<string, unknown>) => HTMLElement)({
                native: emoji,
                set: 'twitter',
                size,
            });
            ref.current.innerHTML = '';
            ref.current.appendChild(el);
        });

        return () => { cancelled = true; };
    }, [emoji, size]);

    return (
        <span
            ref={ref}
            className={className}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
            {emoji}
        </span>
    );
}

export default TwemojiSpan;
