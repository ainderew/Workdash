import { Scene } from "phaser";
import { CharacterCustomization } from "@/game/character/_types";
import {
    getCharacterLayerPathsArray,
    BASE_PATH,
} from "@/common/components/CharacterCreation/AssetConfig";
import useUserStore from "@/common/store/useStore";

const OUTPUT_FRAME_WIDTH = 32;
const OUTPUT_FRAME_HEIGHT = 64;

/** The idle loop facing the camera: sheet row 1, columns 18-23. */
const IDLE_DOWN_ROW = 1;
const IDLE_DOWN_COL = 18;
const IDLE_DOWN_FRAMES = 6;
/**
 * The sheets have no sitting-facing-the-camera frames. The idle ones with
 * the upper legs (frame rows 56-59) cut out read as seated with bent knees.
 */
const SIT_DOWN_DROP_FROM = 56;
const SIT_DOWN_DROP_TO = 59;

export class CharacterCompositor {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public async createAnimatedSpritesheet(
        customization: CharacterCustomization,
        outputKey: string,
        isLocal: boolean = false,
    ): Promise<void> {
        const layerPaths = getCharacterLayerPathsArray(
            customization,
            BASE_PATH,
        );
        const loadedImages = await this.loadAllLayers(layerPaths);

        
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

        const kartImage = await this.loadKartSprite();
        if (kartImage) {
            ctx.drawImage(
                kartImage,
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

        this.addSitDownFrames(canvas, outputKey);

        const imageData = canvas.toDataURL("image/png");

        
        if (isLocal) {
            useUserStore.getState().updateUser({
                spriteSheetDataUrl: imageData,
            });
        }

        await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (this.scene.textures.exists(outputKey))
                    this.scene.textures.remove(outputKey);

                this.scene.textures.addSpriteSheet(outputKey, img, {
                    frameWidth: OUTPUT_FRAME_WIDTH, 
                    frameHeight: OUTPUT_FRAME_HEIGHT, 
                });
                resolve();
            };
            img.src = imageData;

            
        });
    }

    
    /** `${outputKey}-sitdown`: frames 0-5, sitting facing the camera. */
    private addSitDownFrames(source: HTMLCanvasElement, outputKey: string) {
        const key = `${outputKey}-sitdown`;
        const w = OUTPUT_FRAME_WIDTH;
        const h = OUTPUT_FRAME_HEIGHT;
        const canvas = document.createElement("canvas");
        canvas.width = w * IDLE_DOWN_FRAMES;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        const below = SIT_DOWN_DROP_TO + 1;
        for (let i = 0; i < IDLE_DOWN_FRAMES; i++) {
            const sx = (IDLE_DOWN_COL + i) * w;
            const sy = IDLE_DOWN_ROW * h;
            // Head and body as they are, then the feet moved up under the knees
            ctx.drawImage(source, sx, sy, w, SIT_DOWN_DROP_FROM, i * w, 0, w, SIT_DOWN_DROP_FROM);
            ctx.drawImage(source, sx, sy + below, w, h - below, i * w, SIT_DOWN_DROP_FROM, w, h - below);
        }
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        const texture = this.scene.textures.addCanvas(key, canvas);
        for (let i = 0; i < IDLE_DOWN_FRAMES; i++) texture?.add(i, 0, i * w, 0, w, h);
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

    private async loadKartSprite(): Promise<HTMLImageElement | null> {
        const kartPath = `${BASE_PATH}/Kart/Kart_32x32_01.png`;
        try {
            return await new Promise<HTMLImageElement>((res, rej) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => res(img);
                img.onerror = rej;
                img.src = kartPath;
            });
        } catch {
            return null;
        }
    }
}
