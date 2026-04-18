import React from "react";
import Image from "next/image";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import type { PendingAttachmentUpload } from "@/communication/chatV2/_types";
import { FileTypeIcon } from "../FileTypeIcon";
import {
    formatFileSize,
    getFileCategory,
} from "@/communication/chatV2/fileCategories";

interface ComposerAttachmentTileProps {
    upload: PendingAttachmentUpload;
    onRemove?: () => void;
    onCancel?: () => void;
    onRetry?: () => void;
    onPreviewClick?: (url: string, name: string) => void;
    isDragging?: boolean;
    readOnly?: boolean;
}

const isMediaTile = (mimeType: string): boolean => {
    const category = getFileCategory(mimeType);
    return category === "image" || category === "video";
};

const statusLabel = (status: PendingAttachmentUpload["status"]): string => {
    switch (status) {
        case "preparing":
            return "Reading…";
        case "uploading":
            return "Uploading";
        case "uploaded":
            return "Ready";
        case "failed":
            return "Failed";
        case "cancelled":
            return "Cancelled";
    }
};

export function ComposerAttachmentTile({
    upload,
    onRemove,
    onCancel,
    onRetry,
    onPreviewClick,
    isDragging = false,
    readOnly = false,
}: ComposerAttachmentTileProps) {
    const media = isMediaTile(upload.mimeType);
    const isInFlight =
        upload.status === "preparing" || upload.status === "uploading";
    const progressPct = Math.min(
        100,
        Math.max(0, Math.round((upload.progress ?? 0) * 100)),
    );

    const handleTopRightClick = () => {
        if (isInFlight) onCancel?.();
        else onRemove?.();
    };

    const containerClass = [
        "relative rounded-lg overflow-hidden wd-bg-elevated border wd-border-subtle",
        media
            ? "h-[120px] w-[120px]"
            : "h-[64px] w-[240px] flex items-center gap-3 px-3",
        upload.status === "failed" ? "border-[var(--wd-danger)]" : "",
        upload.status === "cancelled" ? "opacity-50" : "",
        isDragging ? "opacity-60" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className={containerClass}
            role="listitem"
            aria-label={`${upload.displayName}, ${statusLabel(upload.status)}`}
        >
            {media ? (
                <MediaPreview
                    upload={upload}
                    onPreviewClick={onPreviewClick}
                />
            ) : (
                <FileMeta upload={upload} />
            )}

            {/* Remove/cancel/retry buttons hidden in read-only mode */}

            {/* Status overlay */}
            {upload.status === "preparing" && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-start bg-[var(--wd-lightbox-overlay)]/40 p-2">
                    <span className="text-[10px] font-medium wd-text-primary">
                        Reading…
                    </span>
                </div>
            )}

            {upload.status === "uploaded" && (
                <div className="pointer-events-none absolute right-8 top-1 flex items-center justify-center text-[var(--wd-success)] wd-anim-tile-confirm">
                    <span aria-hidden="true" className="text-sm font-bold">
                        ✓
                    </span>
                </div>
            )}

            {/* Progress bar */}
            {(upload.status === "uploading" ||
                upload.status === "uploaded") && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--wd-border-subtle)]">
                    <div
                        className={`h-full bg-[var(--wd-accent)] transition-[width] duration-200 ${
                            progressPct === 100 ? "wd-anim-tile-confirm" : ""
                        }`}
                        data-progress={progressPct}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            )}

            {/* Failed pill */}
            {upload.status === "failed" && !readOnly && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="absolute bottom-1 left-1 right-10 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--wd-danger)] bg-[var(--wd-danger-soft)] wd-ring-focus"
                    aria-label={`Retry uploading ${upload.displayName}`}
                >
                    <AlertTriangle size={10} />
                    <span className="truncate">
                        {upload.error ?? "Upload failed"}
                    </span>
                    <RotateCcw size={10} className="ml-auto" />
                </button>
            )}

            {upload.status === "failed" && readOnly && (
                <div className="pointer-events-none absolute bottom-1 left-2 right-2 flex items-center gap-1 text-[10px] wd-text-danger">
                    <AlertTriangle size={10} aria-hidden="true" />
                    <span className="truncate">
                        {upload.error ?? "Upload failed"}
                    </span>
                </div>
            )}

            {upload.status === "cancelled" && (
                <div className="pointer-events-none absolute bottom-1 left-2 text-[10px] wd-text-muted">
                    Cancelled
                </div>
            )}

            {!readOnly && (
                <button
                    type="button"
                    onClick={handleTopRightClick}
                    aria-label={
                        isInFlight
                            ? `Cancel upload of ${upload.displayName}`
                            : `Remove ${upload.displayName}`
                    }
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--wd-lightbox-overlay)] wd-text-primary hover:bg-[var(--wd-lightbox-overlay)]/80 wd-ring-focus"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

interface MediaPreviewProps {
    upload: PendingAttachmentUpload;
    onPreviewClick?: (url: string, name: string) => void;
}

function MediaPreview({ upload, onPreviewClick }: MediaPreviewProps) {
    const previewUrl = upload.previewUrl;
    const category = getFileCategory(upload.mimeType);

    if (!previewUrl) {
        return (
            <div className="flex h-full w-full items-center justify-center wd-text-muted">
                <FileTypeIcon
                    mimeType={upload.mimeType}
                    filename={upload.displayName}
                    size={28}
                />
            </div>
        );
    }

    if (category === "video") {
        return (
            <video
                src={previewUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
                aria-label={upload.displayName}
            />
        );
    }

    if (!onPreviewClick) {
        return (
            <Image
                src={previewUrl}
                alt={upload.displayName}
                width={120}
                height={120}
                unoptimized
                className="h-full w-full object-cover"
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => onPreviewClick(previewUrl, upload.displayName)}
            className="block h-full w-full wd-ring-focus"
            aria-label={`Preview ${upload.displayName}`}
        >
            <Image
                src={previewUrl}
                alt={upload.displayName}
                width={120}
                height={120}
                unoptimized
                className="h-full w-full object-cover"
            />
        </button>
    );
}

interface FileMetaProps {
    upload: PendingAttachmentUpload;
}

function FileMeta({ upload }: FileMetaProps) {
    return (
        <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--wd-surface-panel)] wd-text-muted">
                <FileTypeIcon
                    mimeType={upload.mimeType}
                    filename={upload.displayName}
                    size={20}
                />
            </div>
            <div className="min-w-0 flex-1 pr-6">
                <div className="truncate text-xs font-medium wd-text-primary">
                    {upload.displayName}
                </div>
                <div className="text-[10px] wd-text-muted">
                    {formatFileSize(upload.sizeBytes)}
                </div>
            </div>
        </>
    );
}
