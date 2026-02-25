import { useState, useEffect } from "react";
import type { CharacterCustomization } from "@/game/character/_types";
import { CharacterType } from "@/game/character/_types";
import { getCharacterLayerPathsArray, BASE_PATH } from "@/common/components/CharacterCreation/AssetConfig";

const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 64;
const IDLE_ROW = 1;
const IDLE_COL = 18;

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

function toCacheKey(customization: CharacterCustomization): string {
    return JSON.stringify([
        customization.type,
        customization.bodyId,
        customization.eyesId,
        customization.hairstyleId,
        customization.outfitId,
        customization.accessoryId ?? 0,
        customization.itemId ?? 0,
        customization.itemType ?? "",
    ]);
}

export async function generateCharacterFaceDataUrl(
    customization: CharacterCustomization,
): Promise<string | null> {
    const key = toCacheKey(customization);

    const cached = cache.get(key);
    if (cached) return cached;

    const inflight = pending.get(key);
    if (inflight) return inflight;

    const promise = (async (): Promise<string | null> => {
        try {
            const layers = getCharacterLayerPathsArray(customization, BASE_PATH);
            const canvas = document.createElement("canvas");
            canvas.width = FRAME_WIDTH;
            canvas.height = FRAME_HEIGHT;
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;

            ctx.imageSmoothingEnabled = false;

            for (const layerPath of layers) {
                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = layerPath;

                    img.onload = () => {
                        const cols = Math.floor(img.width / FRAME_WIDTH);
                        const rows = Math.floor(img.height / FRAME_HEIGHT);
                        const safeRow = Math.min(IDLE_ROW, rows - 1);
                        const safeCol = Math.min(IDLE_COL, cols - 1);

                        ctx.drawImage(
                            img,
                            safeCol * FRAME_WIDTH,
                            safeRow * FRAME_HEIGHT,
                            FRAME_WIDTH,
                            FRAME_HEIGHT,
                            0,
                            0,
                            FRAME_WIDTH,
                            FRAME_HEIGHT,
                        );
                        resolve();
                    };

                    img.onerror = () => resolve();
                });
            }

            const dataUrl = canvas.toDataURL("image/png");
            cache.set(key, dataUrl);
            return dataUrl;
        } catch {
            return null;
        } finally {
            pending.delete(key);
        }
    })();

    pending.set(key, promise);
    return promise;
}

/**
 * Normalize a raw characterCustomization payload from the server
 * into the CharacterCustomization interface expected by asset utilities.
 */
export function toCharacterCustomization(
    raw: {
        type: string;
        bodyId: number;
        eyesId: number;
        hairstyleId: number;
        outfitId: number;
        accessoryId?: number;
        itemId?: number;
        itemType?: string;
    },
): CharacterCustomization {
    return {
        type: raw.type === "KID" ? CharacterType.KID : CharacterType.ADULT,
        bodyId: raw.bodyId,
        eyesId: raw.eyesId,
        hairstyleId: raw.hairstyleId,
        outfitId: raw.outfitId,
        accessoryId: raw.accessoryId,
        itemId: raw.itemId,
        itemType: raw.itemType as CharacterCustomization["itemType"],
    };
}

export function useCharacterFaceAvatar(
    customization: {
        type: string;
        bodyId: number;
        eyesId: number;
        hairstyleId: number;
        outfitId: number;
        accessoryId?: number;
        itemId?: number;
        itemType?: string;
    } | null | undefined,
): string | null {
    const [dataUrl, setDataUrl] = useState<string | null>(() => {
        if (!customization) return null;
        const key = toCacheKey(toCharacterCustomization(customization));
        return cache.get(key) ?? null;
    });

    useEffect(() => {
        if (!customization) {
            setDataUrl(null);
            return;
        }

        let cancelled = false;
        void generateCharacterFaceDataUrl(toCharacterCustomization(customization)).then(
            (url) => {
                if (!cancelled) setDataUrl(url);
            },
        );

        return () => {
            cancelled = true;
        };
    }, [
        customization?.type,
        customization?.bodyId,
        customization?.eyesId,
        customization?.hairstyleId,
        customization?.outfitId,
        customization?.accessoryId,
        customization?.itemId,
        customization?.itemType,
    ]);

    return dataUrl;
}
