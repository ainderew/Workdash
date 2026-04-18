import React, { useEffect, useRef } from "react";
import { decode as decodeBlurhash } from "blurhash";

interface BlurhashCanvasProps {
    blurhash: string | null;
    /** Render pixel dimensions (canvas attribute size). Keep small — the browser scales it up. */
    width?: number;
    height?: number;
    className?: string;
}

const DEFAULT_DECODE_SIZE = 32;

const scheduleIdle = (cb: () => void): (() => void) => {
    if (
        typeof window !== "undefined" &&
        typeof window.requestIdleCallback === "function"
    ) {
        const handle = window.requestIdleCallback(cb, { timeout: 200 });
        return () => window.cancelIdleCallback(handle);
    }
    const frame = requestAnimationFrame(cb);
    return () => cancelAnimationFrame(frame);
};

export function BlurhashCanvas({
    blurhash,
    width = DEFAULT_DECODE_SIZE,
    height = DEFAULT_DECODE_SIZE,
    className,
}: BlurhashCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!blurhash) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        let cancelled = false;
        const cancelIdle = scheduleIdle(() => {
            if (cancelled) return;
            try {
                const pixels = decodeBlurhash(blurhash, width, height);
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                const imageData = ctx.createImageData(width, height);
                imageData.data.set(pixels);
                ctx.putImageData(imageData, 0, 0);
            } catch {
                // Decode failed — caller has a solid-color fallback behind this layer.
            }
        });

        return () => {
            cancelled = true;
            cancelIdle();
        };
    }, [blurhash, width, height]);

    if (!blurhash) return null;

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={className}
            aria-hidden="true"
        />
    );
}
