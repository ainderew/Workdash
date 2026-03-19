import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    X,
} from "lucide-react";
import { downloadChatFile, getChatFilePreviewUrl } from "@/communication/chatV2/uploadService";
import { toast } from "sonner";

export interface LightboxImage {
    fileId: string;
    imageUrl: string;
    fileName: string;
}

interface ImagePreviewLightboxProps {
    onClose: () => void;
    current: LightboxImage;
    gallery?: LightboxImage[];
}

function ImagePreviewLightbox({ onClose, current, gallery }: ImagePreviewLightboxProps) {
    const [activeImage, setActiveImage] = useState<LightboxImage>(current);
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    const activeIndex = gallery?.findIndex((img) => img.fileId === activeImage.fileId && img.fileName === activeImage.fileName) ?? -1;
    const canPrev = gallery && activeIndex > 0;
    const canNext = gallery && activeIndex >= 0 && activeIndex < gallery.length - 1;

    const navigateTo = useCallback(async (image: LightboxImage) => {
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
    }, []);

    const goNext = useCallback(() => {
        if (canNext && gallery) void navigateTo(gallery[activeIndex + 1]);
    }, [canNext, gallery, activeIndex, navigateTo]);

    const goPrev = useCallback(() => {
        if (canPrev && gallery) void navigateTo(gallery[activeIndex - 1]);
    }, [canPrev, gallery, activeIndex, navigateTo]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            } else if (e.key === "ArrowLeft") {
                e.stopPropagation();
                goPrev();
            } else if (e.key === "ArrowRight") {
                e.stopPropagation();
                goNext();
            }
        };
        window.addEventListener("keydown", handler, { capture: true });
        return () => window.removeEventListener("keydown", handler, { capture: true });
    }, [onClose, goNext, goPrev]);

    useEffect(() => {
        document.body.classList.add("overflow-hidden");
        return () => document.body.classList.remove("overflow-hidden");
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleDownload = () => {
        if (!activeImage.fileId) return;
        void (async () => {
            try {
                await downloadChatFile(activeImage.fileId);
            } catch (err) {
                toast("Download failed", {
                    description: err instanceof Error ? err.message : "Please try again.",
                });
            }
        })();
    };

    const handleImageError = () => {
        if (!activeImage.fileId) {
            toast("Image failed to load");
            return;
        }
        void (async () => {
            try {
                const freshUrl = await getChatFilePreviewUrl(activeImage.fileId);
                setActiveImage((prev) => ({ ...prev, imageUrl: freshUrl }));
            } catch {
                toast("Image failed to load", { description: "The signed URL may have expired." });
            }
        })();
    };

    return (
        <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center wd-lightbox-overlay backdrop-blur-sm wd-anim-lightbox-in"
            onClick={handleBackdropClick}
        >
            {/* Close button */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full wd-lightbox-control inline-flex items-center justify-center transition-colors hover:wd-lightbox-control-hover"
                aria-label="Close lightbox"
            >
                <X size={20} />
            </button>

            {/* Gallery prev */}
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

            {/* Gallery next */}
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

            {/* Image container */}
            <div className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center">
                {isLoadingUrl && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 size={32} className="wd-lightbox-muted animate-spin" />
                    </div>
                )}
                {activeImage.imageUrl && (
                    <Image
                        key={activeImage.imageUrl}
                        src={activeImage.imageUrl}
                        alt={activeImage.fileName || "Image preview"}
                        width={1920}
                        height={1080}
                        unoptimized
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-md"
                        onError={handleImageError}
                    />
                )}
            </div>

            {/* Bottom toolbar */}
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
                {gallery && gallery.length > 1 && (
                    <span className="text-xs wd-lightbox-muted">
                        {activeIndex + 1} / {gallery.length}
                    </span>
                )}
            </div>
        </div>
    );
}

export default ImagePreviewLightbox;
