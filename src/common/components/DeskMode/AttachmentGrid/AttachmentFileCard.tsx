import React from "react";
import { Clock, Download, ExternalLink } from "lucide-react";
import type { ChatV2Attachment } from "@/communication/chatV2/_types";
import { FileTypeIcon } from "../FileTypeIcon";
import {
    formatFileSize,
    getExpiryLabel,
    getFileCategory,
    type FileCategory,
} from "@/communication/chatV2/fileCategories";

interface AttachmentFileCardProps {
    attachment: ChatV2Attachment;
    viewUrl: string | null;
    onDownload: () => void;
}

const CATEGORY_LABEL: Record<FileCategory, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
    document: "Document",
    archive: "Archive",
    unknown: "File",
};

const isPdf = (mimeType: string): boolean => mimeType === "application/pdf";
const isAudio = (mimeType: string): boolean => mimeType.startsWith("audio/");

export function AttachmentFileCard({
    attachment,
    viewUrl,
    onDownload,
}: AttachmentFileCardProps) {
    const category = getFileCategory(attachment.mimeType);
    const expiryLabel = getExpiryLabel(attachment.expiresAt);

    return (
        <div className="flex w-full max-w-md flex-col gap-2 rounded-xl wd-bg-elevated border wd-border-subtle p-3">
            <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg wd-bg-accent-soft wd-text-accent">
                    <FileTypeIcon
                        mimeType={attachment.mimeType}
                        filename={attachment.originalFileName}
                        size={24}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium wd-text-primary">
                        {attachment.originalFileName}
                    </div>
                    <div className="flex items-center gap-2 text-xs wd-text-muted">
                        <span>{CATEGORY_LABEL[category]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatFileSize(attachment.sizeBytes)}</span>
                    </div>
                    {expiryLabel && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] wd-text-warning">
                            <Clock size={10} aria-hidden="true" />
                            {expiryLabel}
                        </div>
                    )}
                </div>
            </div>

            {isAudio(attachment.mimeType) && viewUrl && (
                <audio
                    src={viewUrl}
                    controls
                    preload="metadata"
                    className="w-full"
                    aria-label={attachment.originalFileName}
                />
            )}

            <div className="flex items-center gap-2">
                {isPdf(attachment.mimeType) && viewUrl && (
                    <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md wd-bg-accent-soft wd-text-accent px-2.5 py-1 text-xs font-medium wd-ring-focus"
                    >
                        <ExternalLink size={12} aria-hidden="true" />
                        Open
                    </a>
                )}
                <button
                    type="button"
                    onClick={onDownload}
                    className="inline-flex items-center gap-1 rounded-md border wd-border-subtle px-2.5 py-1 text-xs font-medium wd-text-primary hover:wd-bg-elevated wd-ring-focus"
                >
                    <Download size={12} aria-hidden="true" />
                    Download
                </button>
            </div>
        </div>
    );
}
