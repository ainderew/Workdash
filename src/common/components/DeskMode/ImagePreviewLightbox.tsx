import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import {
    animate,
    motion,
    useMotionValue,
    type PanInfo,
} from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    HelpCircle,
    Loader2,
    X,
} from "lucide-react";
import {
    downloadChatFile,
    getChatFilePreviewUrl,
} from "@/communication/chatV2/uploadService";
import { invalidateCachedUrl } from "@/communication/chatV2/urlCacheService";
import { toast } from "sonner";

export interface LightboxImage {
    fileId: string;
    imageUrl: string;
    fileName: string;
    width?: number | null;
    height?: number | null;
}

interface ImagePreviewLightboxProps {
    onClose: () => void;
    current: LightboxImage;
    gallery?: LightboxImage[];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;
const DOUBLE_CLICK_MS = 300;
const SWIPE_THRESHOLD_PX = 80;
const DISMISS_THRESHOLD_PX = 100;
const DISMISS_VELOCITY = 300;
const REFRESH_WINDOW_MS = 30_000;
const SETTLE_DURATION = 0.18;

function ImagePreviewLightbox({
    onClose,
    current,
    gallery,
}: ImagePreviewLightboxProps) {
    const [activeImage, setActiveImage] = useState<LightboxImage>(current);
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const lastClickTimestampRef = useRef<number>(0);
    const refreshAttemptsRef = useRef<
        Record<string, { count: number; at: number }>
    >({});
    const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
        new Map(),
    );
    const pinchStartRef = useRef<{ distance: number; scale: number } | null>(
        null,
    );

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const scale = useMotionValue(1);

    const activeIndex =
        gallery?.findIndex(
            (img) =>
                img.fileId === activeImage.fileId &&
                img.fileName === activeImage.fileName,
        ) ?? -1;
    const canPrev = !!gallery && activeIndex > 0;
    const canNext =
        !!gallery && activeIndex >= 0 && activeIndex < gallery.length - 1;

    const resetTransform = useCallback(() => {
        animate(x, 0, { duration: SETTLE_DURATION });
        animate(y, 0, { duration: SETTLE_DURATION });
        animate(scale, 1, { duration: SETTLE_DURATION });
    }, [scale, x, y]);

    useEffect(() => {
        x.set(0);
        y.set(0);
        scale.set(1);
    }, [activeImage.fileId, activeImage.imageUrl, scale, x, y]);

    const navigateTo = useCallback(
        async (image: LightboxImage) => {
            if (image.imageUrl) {
                setActiveImage(image);
                return;
            }
            if (!image.fileId) {
                setActiveImage(image);
                return;
            }
            setIsLoadingUrl(true);
            try {
                const url = await getChatFilePreviewUrl(image.fileId);
                setActiveImage({ ...image, imageUrl: url });
            } catch {
                toast("Failed to load image");
            } finally {
                setIsLoadingUrl(false);
            }
        },
        [],
    );

    const goNext = useCallback(() => {
        if (canNext && gallery) void navigateTo(gallery[activeIndex + 1]);
    }, [activeIndex, canNext, gallery, navigateTo]);

    const goPrev = useCallback(() => {
        if (canPrev && gallery) void navigateTo(gallery[activeIndex - 1]);
    }, [activeIndex, canPrev, gallery, navigateTo]);

    const handleDownload = useCallback(() => {
        if (!activeImage.fileId) return;
        void (async () => {
            try {
                await downloadChatFile(activeImage.fileId);
            } catch (err) {
                toast("Download failed", {
                    description:
                        err instanceof Error ? err.message : "Please try again.",
                });
            }
        })();
    }, [activeImage.fileId]);

    const zoomBy = useCallback(
        (factor: number) => {
            const next = Math.max(
                MIN_ZOOM,
                Math.min(MAX_ZOOM, scale.get() * factor),
            );
            animate(scale, next, { duration: 0.12 });
            if (next === 1) {
                animate(x, 0, { duration: 0.12 });
                animate(y, 0, { duration: 0.12 });
            }
        },
        [scale, x, y],
    );

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                if (showHelp) {
                    setShowHelp(false);
                    return;
                }
                onClose();
            } else if (e.key === "ArrowLeft") {
                e.stopPropagation();
                goPrev();
            } else if (e.key === "ArrowRight") {
                e.stopPropagation();
                goNext();
            } else if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
                e.stopPropagation();
                setShowHelp((prev) => !prev);
            } else if (e.key === "d" || e.key === "D") {
                if (e.metaKey || e.ctrlKey || e.altKey) return;
                e.stopPropagation();
                handleDownload();
            } else if (e.key === "+" || e.key === "=") {
                e.stopPropagation();
                zoomBy(ZOOM_STEP);
            } else if (e.key === "-" || e.key === "_") {
                e.stopPropagation();
                zoomBy(1 / ZOOM_STEP);
            }
        };
        window.addEventListener("keydown", handler, { capture: true });
        return () =>
            window.removeEventListener("keydown", handler, { capture: true });
    }, [goNext, goPrev, handleDownload, onClose, showHelp, zoomBy]);

    useEffect(() => {
        document.body.classList.add("overflow-hidden");
        return () => document.body.classList.remove("overflow-hidden");
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleImageError = useCallback(() => {
        const fileId = activeImage.fileId;
        if (!fileId) {
            toast("Image failed to load");
            return;
        }
        const now = Date.now();
        const entry = refreshAttemptsRef.current[fileId] ?? {
            count: 0,
            at: 0,
        };
        if (entry.count >= 1 && now - entry.at < REFRESH_WINDOW_MS) {
            toast("Image failed to load", {
                description: "The signed URL may have expired.",
                action: {
                    label: "Retry",
                    onClick: () => {
                        refreshAttemptsRef.current[fileId] = {
                            count: 0,
                            at: 0,
                        };
                        invalidateCachedUrl(fileId);
                        void (async () => {
                            try {
                                const freshUrl =
                                    await getChatFilePreviewUrl(fileId);
                                setActiveImage((prev) => ({
                                    ...prev,
                                    imageUrl: freshUrl,
                                }));
                            } catch {
                                toast("Failed to load image");
                            }
                        })();
                    },
                },
            });
            return;
        }
        refreshAttemptsRef.current[fileId] = { count: entry.count + 1, at: now };
        invalidateCachedUrl(fileId);
        void (async () => {
            try {
                const freshUrl = await getChatFilePreviewUrl(fileId);
                setActiveImage((prev) => ({ ...prev, imageUrl: freshUrl }));
            } catch {
                // next error shows the toast
            }
        })();
    }, [activeImage.fileId]);

    const handleDragEnd = useCallback(
        (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
            if (scale.get() > 1) return;
            if (
                info.offset.y > DISMISS_THRESHOLD_PX &&
                info.velocity.y > DISMISS_VELOCITY
            ) {
                onClose();
                return;
            }
            if (Math.abs(info.offset.x) > SWIPE_THRESHOLD_PX) {
                if (info.offset.x > 0) goPrev();
                else goNext();
                animate(x, 0, { duration: SETTLE_DURATION });
                animate(y, 0, { duration: SETTLE_DURATION });
                return;
            }
            animate(x, 0, { duration: SETTLE_DURATION });
            animate(y, 0, { duration: SETTLE_DURATION });
        },
        [goNext, goPrev, onClose, scale, x, y],
    );

    const handleWheel = useCallback(
        (event: React.WheelEvent<HTMLDivElement>) => {
            event.preventDefault();
            const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
            zoomBy(factor);
        },
        [zoomBy],
    );

    const handleImageClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const now = Date.now();
            const delta = now - lastClickTimestampRef.current;
            lastClickTimestampRef.current = now;
            if (delta >= DOUBLE_CLICK_MS) return;
            lastClickTimestampRef.current = 0;

            const currentScale = scale.get();
            if (currentScale > 1) {
                resetTransform();
                return;
            }

            const rect =
                imageContainerRef.current?.getBoundingClientRect() ?? null;
            if (!rect) {
                animate(scale, 2, { duration: 0.15 });
                return;
            }
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const targetScale = 2;
            const translateX = (centerX - event.clientX) * (targetScale - 1);
            const translateY = (centerY - event.clientY) * (targetScale - 1);
            animate(scale, targetScale, { duration: 0.15 });
            animate(x, translateX, { duration: 0.15 });
            animate(y, translateY, { duration: 0.15 });
        },
        [resetTransform, scale, x, y],
    );

    const pointersDistance = useCallback(() => {
        const pointers = Array.from(activePointersRef.current.values());
        if (pointers.length < 2) return 0;
        const [a, b] = pointers;
        return Math.hypot(a.x - b.x, a.y - b.y);
    }, []);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            activePointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });
            if (activePointersRef.current.size === 2) {
                pinchStartRef.current = {
                    distance: pointersDistance(),
                    scale: scale.get(),
                };
            }
        },
        [pointersDistance, scale],
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!activePointersRef.current.has(event.pointerId)) return;
            activePointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });
            if (
                activePointersRef.current.size === 2 &&
                pinchStartRef.current
            ) {
                const currentDistance = pointersDistance();
                if (currentDistance <= 0) return;
                const ratio = currentDistance / pinchStartRef.current.distance;
                const next = Math.max(
                    MIN_ZOOM,
                    Math.min(MAX_ZOOM, pinchStartRef.current.scale * ratio),
                );
                scale.set(next);
            }
        },
        [pointersDistance, scale],
    );

    const handlePointerUp = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            activePointersRef.current.delete(event.pointerId);
            if (activePointersRef.current.size < 2) {
                pinchStartRef.current = null;
            }
            if (scale.get() <= MIN_ZOOM + 0.01) {
                animate(scale, 1, { duration: 0.12 });
                animate(x, 0, { duration: 0.12 });
                animate(y, 0, { duration: 0.12 });
            }
        },
        [scale, x, y],
    );

    const reservedWidth =
        activeImage.width && activeImage.height
            ? Math.min(activeImage.width, 1920)
            : 1920;
    const reservedHeight =
        activeImage.width && activeImage.height
            ? Math.round(
                  (reservedWidth * activeImage.height) / activeImage.width,
              )
            : 1080;

    return (
        <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center wd-lightbox-overlay backdrop-blur-sm wd-anim-lightbox-in"
            onClick={handleBackdropClick}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full wd-lightbox-control inline-flex items-center justify-center transition-colors hover:wd-lightbox-control-hover"
                aria-label="Close lightbox"
            >
                <X size={20} />
            </button>

            {canPrev && (
                <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full wd-lightbox-control inline-flex items-center justify-center transition-colors hover:wd-lightbox-control-hover"
                    aria-label="Previous image"
                >
                    <ChevronLeft size={24} />
                </button>
            )}

            {canNext && (
                <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full wd-lightbox-control inline-flex items-center justify-center transition-colors hover:wd-lightbox-control-hover"
                    aria-label="Next image"
                >
                    <ChevronRight size={24} />
                </button>
            )}

            <div
                ref={imageContainerRef}
                className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center touch-none overflow-hidden"
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {isLoadingUrl && (
                    <div
                        className="flex items-center justify-center wd-lightbox-loading"
                        style={{
                            width: Math.min(reservedWidth, 960),
                            height: Math.min(reservedHeight, 540),
                        }}
                    >
                        <Loader2
                            size={32}
                            className="wd-lightbox-muted animate-spin"
                        />
                    </div>
                )}
                {!isLoadingUrl && activeImage.imageUrl && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        dragElastic={0.3}
                        onDragEnd={handleDragEnd}
                        onClick={handleImageClick}
                        style={{ x, y, scale }}
                        className="will-change-transform cursor-grab active:cursor-grabbing"
                    >
                        <Image
                            key={activeImage.imageUrl}
                            src={activeImage.imageUrl}
                            alt={activeImage.fileName || "Image preview"}
                            width={reservedWidth}
                            height={reservedHeight}
                            unoptimized
                            draggable={false}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-md select-none pointer-events-none"
                            onError={handleImageError}
                        />
                    </motion.div>
                )}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-lg wd-lightbox-toolbar px-4 py-2 backdrop-blur-sm">
                <span className="text-sm wd-lightbox-text truncate max-w-[50vw]">
                    {activeImage.fileName}
                </span>
                {activeImage.fileId && (
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="h-7 w-7 rounded-md wd-lightbox-control inline-flex items-center justify-center transition-colors hover:wd-lightbox-control-hover"
                        aria-label="Download image"
                    >
                        <Download size={14} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setShowHelp((prev) => !prev)}
                    className="h-7 w-7 rounded-md wd-lightbox-control inline-flex items-center justify-center transition-colors hover:wd-lightbox-control-hover"
                    aria-label="Keyboard shortcuts"
                    aria-pressed={showHelp}
                >
                    <HelpCircle size={14} />
                </button>
                {gallery && gallery.length > 1 && (
                    <span className="text-xs wd-lightbox-muted">
                        {activeIndex + 1} / {gallery.length}
                    </span>
                )}
            </div>

            {showHelp && (
                <div
                    role="dialog"
                    aria-label="Lightbox keyboard shortcuts"
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 rounded-lg wd-lightbox-toolbar px-4 py-3 text-xs wd-lightbox-text shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                >
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide wd-lightbox-muted">
                        Shortcuts
                    </div>
                    <ul className="space-y-1">
                        <li>
                            <kbd className="wd-lightbox-kbd">←</kbd> /{" "}
                            <kbd className="wd-lightbox-kbd">→</kbd> navigate
                        </li>
                        <li>
                            <kbd className="wd-lightbox-kbd">+</kbd> /{" "}
                            <kbd className="wd-lightbox-kbd">−</kbd> zoom
                        </li>
                        <li>
                            <kbd className="wd-lightbox-kbd">D</kbd> download
                        </li>
                        <li>
                            <kbd className="wd-lightbox-kbd">Esc</kbd> close
                        </li>
                        <li>
                            <kbd className="wd-lightbox-kbd">?</kbd> toggle this
                            help
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default ImagePreviewLightbox;
