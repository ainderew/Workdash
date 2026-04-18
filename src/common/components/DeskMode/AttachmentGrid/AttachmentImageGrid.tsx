import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ChatV2Attachment } from "@/communication/chatV2/_types";
import { invalidateCachedUrl } from "@/communication/chatV2/urlCacheService";
import { getChatFilePreviewUrl } from "@/communication/chatV2/uploadService";
import { BlurhashCanvas } from "./BlurhashCanvas";
import {
    computeImageGridLayout,
    type GridCellSpec,
} from "./computeImageGridLayout";
import type { AttachmentUrlMap, AttachmentUrls } from "./_types";

interface AttachmentImageGridProps {
    attachments: ChatV2Attachment[];
    urlsByFileId: AttachmentUrlMap;
    onTileClick: (galleryIndex: number) => void;
}

const SINGLE_IMAGE_MAX = 400;
const GRID_MAX_WIDTH = 520;

const aspectValue = (
    attachment: ChatV2Attachment,
): number | null => {
    if (!attachment.width || !attachment.height) return null;
    if (attachment.height === 0) return null;
    return attachment.width / attachment.height;
};

interface GridCellProps {
    cell: GridCellSpec;
    index: number;
    attachment: ChatV2Attachment;
    urls: AttachmentUrls | undefined;
    onClick: () => void;
}

function GridCell({
    cell,
    index,
    attachment,
    urls,
    onClick,
}: GridCellProps) {
    const [src, setSrc] = useState<string | null>(
        urls?.thumbnailUrl ?? urls?.viewUrl ?? null,
    );
    const [hasRetried, setHasRetried] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setSrc(urls?.thumbnailUrl ?? urls?.viewUrl ?? null);
        setHasRetried(false);
        setIsLoaded(false);
    }, [urls?.thumbnailUrl, urls?.viewUrl]);

    const handleError = () => {
        if (hasRetried) return;
        setHasRetried(true);
        invalidateCachedUrl(attachment.id);
        void (async () => {
            try {
                const refreshed = await getChatFilePreviewUrl(attachment.id);
                setSrc(refreshed);
            } catch {
                // Leave the stale src; caller's blurhash remains visible.
            }
        })();
    };

    const aspect = aspectValue(attachment);

    const style: React.CSSProperties = {
        gridColumn: `${cell.colStart} / span ${cell.colSpan}`,
        gridRow: `${cell.rowStart} / span ${cell.rowSpan}`,
    };
    if (cell.aspect === "intrinsic" && aspect != null) {
        style.aspectRatio = `${attachment.width} / ${attachment.height}`;
        style.maxWidth = `${SINGLE_IMAGE_MAX}px`;
        style.maxHeight = `${SINGLE_IMAGE_MAX}px`;
    } else if (cell.aspect === "intrinsic") {
        style.aspectRatio = "16 / 9";
    }

    const objectFit = cell.aspect === "intrinsic" ? "object-contain" : "object-cover";

    return (
        <button
            type="button"
            onClick={onClick}
            style={style}
            className="relative block overflow-hidden rounded-md wd-bg-elevated wd-ring-focus"
            aria-label={`Open ${attachment.originalFileName}`}
            data-gallery-index={index}
        >
            <BlurhashCanvas
                blurhash={attachment.blurhash}
                className="absolute inset-0 h-full w-full"
            />
            {src && (
                <Image
                    src={src}
                    alt={attachment.originalFileName}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 520px"
                    className={`absolute inset-0 h-full w-full ${objectFit} ${
                        isLoaded ? "wd-anim-img-fade-in" : "opacity-0"
                    }`}
                    onLoad={() => setIsLoaded(true)}
                    onError={handleError}
                />
            )}
            {cell.isOverflow && cell.overflowCount != null && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--wd-lightbox-overlay)]/60">
                    <span className="text-2xl font-semibold text-white">
                        +{cell.overflowCount}
                    </span>
                </div>
            )}
        </button>
    );
}

export function AttachmentImageGrid({
    attachments,
    urlsByFileId,
    onTileClick,
}: AttachmentImageGridProps) {
    const layout = useMemo(
        () => computeImageGridLayout(attachments.length),
        [attachments.length],
    );

    if (attachments.length === 0 || layout.cells.length === 0) return null;

    const containerStyle: React.CSSProperties = {
        maxWidth: `${GRID_MAX_WIDTH}px`,
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
        gap: "2px",
    };
    if (layout.containerAspect != null) {
        containerStyle.aspectRatio = `${layout.containerAspect}`;
    }

    return (
        <div className="grid overflow-hidden rounded-lg" style={containerStyle}>
            {layout.cells.map((cell, index) => {
                const attachment = attachments[index];
                if (!attachment) return null;
                return (
                    <GridCell
                        key={attachment.id}
                        cell={cell}
                        index={index}
                        attachment={attachment}
                        urls={urlsByFileId[attachment.id]}
                        onClick={() =>
                            onTileClick(
                                cell.isOverflow ? layout.cells.length - 1 : index,
                            )
                        }
                    />
                );
            })}
        </div>
    );
}
