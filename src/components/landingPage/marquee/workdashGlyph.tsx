import React, { useId } from "react";

/** The WorkDash bubble as a single-ink glyph, for use as a separator. */
export function WorkdashGlyph({ className }: { className?: string }) {
    const id = useId();
    return (
        <svg viewBox="30 10 156 168" className={className} aria-hidden="true">
            <mask id={id}>
                <path
                    d="M36 32Q36 16,52 16L140 16Q156 16,156 32L156 112Q156 128,140 128L92 128L72 156C66 166,70 170,80 168L164 142C176 138,180 132,172 128L156 128L140 128L52 128Q36 128,36 112Z"
                    fill="#fff"
                />
                <rect x="64" y="58" width="14" height="14" rx="3" fill="#000" />
                <rect x="90" y="58" width="14" height="14" rx="3" fill="#000" />
                <rect x="116" y="58" width="14" height="14" rx="3" fill="#000" />
            </mask>
            <rect
                x="30"
                y="10"
                width="156"
                height="168"
                fill="currentColor"
                mask={`url(#${id})`}
            />
        </svg>
    );
}
