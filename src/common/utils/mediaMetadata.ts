import { encode as encodeBlurhash } from "blurhash";

export type ImageMetadata = {
    width: number;
    height: number;
    blurhash: string | null;
};

export type VideoMetadata = {
    width: number;
    height: number;
    durationMs: number;
    poster: File | null;
};

const SUPPORTED_VIDEO_FOR_POSTER = new Set(["video/mp4", "video/webm"]);
const BLURHASH_COMPONENT_X = 4;
const BLURHASH_COMPONENT_Y = 3;
const BLURHASH_SAMPLE_SIZE = 32;

const createCanvas = (
    width: number,
    height: number,
): OffscreenCanvas | HTMLCanvasElement | null => {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    return null;
};

const canvasToWebpBlob = async (
    canvas: OffscreenCanvas | HTMLCanvasElement,
): Promise<Blob | null> => {
    if (canvas instanceof OffscreenCanvas) {
        try {
            return await canvas.convertToBlob({
                type: "image/webp",
                quality: 0.8,
            });
        } catch {
            return null;
        }
    }
    return await new Promise((resolve) => {
        canvas.toBlob(
            (blob) => resolve(blob),
            "image/webp",
            0.8,
        );
    });
};

export const extractImageMetadata = async (
    file: File,
): Promise<ImageMetadata | null> => {
    if (!file.type.startsWith("image/")) return null;

    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        return null;
    }

    const width = bitmap.width;
    const height = bitmap.height;

    let blurhash: string | null = null;
    try {
        const scale = Math.min(
            BLURHASH_SAMPLE_SIZE / width,
            BLURHASH_SAMPLE_SIZE / height,
            1,
        );
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = createCanvas(w, h);
        if (canvas) {
            const ctx = canvas.getContext("2d") as
                | CanvasRenderingContext2D
                | OffscreenCanvasRenderingContext2D
                | null;
            if (ctx) {
                ctx.drawImage(bitmap, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                blurhash = encodeBlurhash(
                    imageData.data,
                    w,
                    h,
                    BLURHASH_COMPONENT_X,
                    BLURHASH_COMPONENT_Y,
                );
            }
        }
    } catch {
        blurhash = null;
    } finally {
        bitmap.close();
    }

    return { width, height, blurhash };
};

export const extractVideoMetadata = async (
    file: File,
): Promise<VideoMetadata | null> => {
    if (!file.type.startsWith("video/")) return null;
    if (typeof document === "undefined") return null;

    const objectUrl = URL.createObjectURL(file);
    try {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = objectUrl;

        await new Promise<void>((resolve, reject) => {
            const onLoaded = () => resolve();
            const onError = () =>
                reject(new Error("Video metadata load failed"));
            video.addEventListener("loadedmetadata", onLoaded, { once: true });
            video.addEventListener("error", onError, { once: true });
        });

        const width = video.videoWidth;
        const height = video.videoHeight;
        const durationMs = Number.isFinite(video.duration)
            ? Math.round(video.duration * 1000)
            : 0;

        let poster: File | null = null;
        if (
            SUPPORTED_VIDEO_FOR_POSTER.has(file.type) &&
            width > 0 &&
            height > 0
        ) {
            try {
                const targetSeconds = Math.min(
                    0.1,
                    Math.max(
                        0,
                        Number.isFinite(video.duration)
                            ? video.duration / 10
                            : 0,
                    ),
                );
                video.currentTime = targetSeconds;
                await new Promise<void>((resolve, reject) => {
                    video.addEventListener(
                        "seeked",
                        () => resolve(),
                        { once: true },
                    );
                    video.addEventListener(
                        "error",
                        () => reject(new Error("seek failed")),
                        { once: true },
                    );
                });

                const canvas = createCanvas(width, height);
                if (canvas) {
                    const ctx = canvas.getContext("2d") as
                        | CanvasRenderingContext2D
                        | OffscreenCanvasRenderingContext2D
                        | null;
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, width, height);
                        const blob = await canvasToWebpBlob(canvas);
                        if (blob && blob.size > 0) {
                            poster = new File(
                                [blob],
                                `${file.name}.poster.webp`,
                                { type: "image/webp" },
                            );
                        }
                    }
                }
            } catch {
                poster = null;
            }
        }

        return { width, height, durationMs, poster };
    } catch {
        return null;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};
