import React, { useEffect, useRef } from "react";
import { CharacterCustomization } from "@/game/character/_types";
import { getCharacterLayerPathsArray, BASE_PATH } from "./AssetConfig";

interface CharacterPreviewProps {
    customization: CharacterCustomization;
    /** Which row to show. 1 = Idle, 2 = Walk, etc. */
    animationRow?: number;
    /** Which column to show. Idle typically starts at col 18. */
    frameCol?: number;
}

// Map logical rows to indices.
export const ANIMATION_ROWS = {
    DOWN: 0,
    IDLE: 1,
    WALK: 2,
    SLEEP: 3,
    SIT: 4,
    PHONE: 6,
} as const;

export function CharacterPreview({
    customization,
    animationRow = ANIMATION_ROWS.IDLE,
    // Default to 18 if you want to see the actual Idle pose, or 0 for "Front Static"
    frameCol = 18,
}: CharacterPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // FIX 1: Define correct dimensions for LPC characters
    // Width is 32 (packed), but Height is 64 (Head + Body)
    const SRC_FRAME_WIDTH = 32;
    const SRC_FRAME_HEIGHT = 64;

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d")!;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const loadAndDraw = async () => {
            try {
                const layers = getCharacterLayerPathsArray(
                    customization,
                    BASE_PATH,
                );

                for (const layerPath of layers) {
                    await new Promise<void>((resolve) => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.src = layerPath;

                        img.onload = () => {
                            // FIX 2: Calculate rows based on 64px height
                            const cols = Math.floor(
                                img.width / SRC_FRAME_WIDTH,
                            );
                            const rows = Math.floor(
                                img.height / SRC_FRAME_HEIGHT,
                            );

                            const safeRow = Math.min(animationRow, rows - 1);
                            const safeCol = Math.min(frameCol, cols - 1);

                            // FIX 3: Capture the full 64px height
                            const srcX = safeCol * SRC_FRAME_WIDTH;
                            const srcY = safeRow * SRC_FRAME_HEIGHT;

                            // FIX 4: Draw proportional to canvas (Prevent "Fat" stretching)
                            // Canvas is 256x256. Character is 1:2 ratio.
                            // We draw it 128x256 (centered).
                            const destWidth = 128;
                            const destHeight = 256;
                            const destX = (canvas.width - destWidth) / 2; // Center X
                            const destY = 0; // Top

                            ctx.drawImage(
                                img,
                                srcX,
                                srcY,
                                SRC_FRAME_WIDTH, // 32
                                SRC_FRAME_HEIGHT, // 64 (Captures horns!)
                                destX,
                                destY,
                                destWidth,
                                destHeight,
                            );
                            resolve();
                        };

                        img.onerror = () => {
                            console.warn(`Failed to load layer: ${layerPath}`);
                            resolve();
                        };
                    });
                }
            } catch (error) {
                console.error("Error compositing character:", error);
            }
        };

        loadAndDraw();
    }, [customization, animationRow, frameCol]);

    return (
        <div className="flex items-center justify-center p-8 bg-slate-800/50 rounded-lg border-2 border-slate-700">
            <canvas
                ref={canvasRef}
                width={256}
                height={256}
                className="pixelated"
                style={{ imageRendering: "pixelated" }}
            />
        </div>
    );
}
