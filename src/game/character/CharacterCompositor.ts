import { Scene } from "phaser";
import { CharacterCustomization } from "@/game/character/_types";
import {
    getCharacterLayerPathsArray,
    BASE_PATH,
    FRAME_SIZE,
} from "@/common/components/CharacterCreation/AssetConfig";

// ADJUSTED: 64px tall to fit head, but 32px wide to match your specific sheet packing
const OUTPUT_FRAME_WIDTH = 32;
const OUTPUT_FRAME_HEIGHT = 64;

export class CharacterCompositor {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public async createAnimatedSpritesheet(
        customization: CharacterCustomization,
        outputKey: string,
    ): Promise<void> {
        const layerPaths = getCharacterLayerPathsArray(
            customization,
            BASE_PATH,
        );
        const loadedImages = await this.loadAllLayers(layerPaths);

        // Keep your original canvas size
        const CANVAS_WIDTH = 1824;
        const CANVAS_HEIGHT = 1312;

        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;

        for (const img of loadedImages) {
            ctx.drawImage(
                img,
                0,
                0,
                CANVAS_WIDTH,
                CANVAS_HEIGHT,
                0,
                0,
                CANVAS_WIDTH,
                CANVAS_HEIGHT,
            );
        }

        const imageData = canvas.toDataURL("image/png");
        this.createDebugButton(imageData, outputKey);

        await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (this.scene.textures.exists(outputKey))
                    this.scene.textures.remove(outputKey);

                // HERE IS THE FIX:
                this.scene.textures.addSpriteSheet(outputKey, img, {
                    frameWidth: OUTPUT_FRAME_WIDTH, // 32px
                    frameHeight: OUTPUT_FRAME_HEIGHT, // 64px
                });
                resolve();
            };
            img.src = imageData;
        });
    }

    private createDebugButton(dataUrl: string, key: string) {
        const existing = document.getElementById("debug-dl");
        if (existing) existing.remove();
        const btn = document.createElement("button");
        btn.id = "debug-dl";
        btn.innerText = `⬇️ DOWNLOAD ${key}`;
        btn.style.cssText =
            "position:fixed; top:10px; left:10px; z-index:9999; background:red; color:white; padding:10px;";
        btn.onclick = () => {
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `${key}.png`;
            a.click();
        };
        document.body.appendChild(btn);
    }

    private async loadAllLayers(paths: string[]): Promise<HTMLImageElement[]> {
        const promises = paths.map(
            (path) =>
                new Promise<HTMLImageElement>((res, rej) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => res(img);
                    img.onerror = rej;
                    img.src = path;
                }),
        );
        const results = await Promise.allSettled(promises);
        return results
            .filter(
                (r): r is PromiseFulfilledResult<HTMLImageElement> =>
                    r.status === "fulfilled",
            )
            .map((r) => r.value);
    }
}
