import React, { useEffect, useRef } from "react";

interface SpriteFramePreviewProps {
    src: string;
    frameIndex?: number;
    row?: number;
    col?: number;
    alt: string;
    className?: string;
    frameWidth?: number;
    frameHeight?: number;
}

export function SpriteFramePreview({
    src,
    frameIndex,
    row = 1,
    col = 18,
    alt,
    className = "",
    frameWidth = 32,
    frameHeight = 64,
}: SpriteFramePreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;

        img.onload = () => {
            const cols = Math.floor(img.width / frameWidth);
            const rows = Math.floor(img.height / frameHeight);

            let srcX: number;
            let srcY: number;

            if (frameIndex !== undefined) {
                const actualCol = frameIndex % cols;
                const actualRow = Math.floor(frameIndex / cols);
                srcX = actualCol * frameWidth;
                srcY = actualRow * frameHeight;
            } else {
                const actualRow = Math.min(row, rows - 1);
                const actualCol = Math.min(col, cols - 1);
                srcX = actualCol * frameWidth;
                srcY = actualRow * frameHeight;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;

            // Draw the extracted frame scaled to canvas size
            ctx.drawImage(
                img,
                srcX,
                srcY,
                frameWidth,
                frameHeight,
                0,
                0,
                canvas.width,
                canvas.height,
            );
        };

        img.onerror = () => {
            console.warn(`Failed to load sprite: ${src}`);

            // Draw a placeholder
            ctx.fillStyle = "#374151";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#6b7280";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText("?", canvas.width / 2, canvas.height / 2 + 4);
        };
    }, [src, frameIndex, row, col, frameWidth, frameHeight]);

    return (
        <canvas
            ref={canvasRef}
            // We set the internal resolution to match the frame size exactly
            width={frameWidth}
            height={frameHeight}
            className={`pixelated ${className}`}
            // CSS fix to ensure browsers render it sharply
            style={{ imageRendering: "pixelated" }}
            title={alt}
        />
    );
}
