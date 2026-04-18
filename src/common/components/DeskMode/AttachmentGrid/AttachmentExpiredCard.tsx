import React from "react";
import { Clock } from "lucide-react";
import type { ChatV2Attachment } from "@/communication/chatV2/_types";
import { FileTypeIcon } from "../FileTypeIcon";

interface AttachmentExpiredCardProps {
    attachment: ChatV2Attachment;
}

export function AttachmentExpiredCard({
    attachment,
}: AttachmentExpiredCardProps) {
    return (
        <div className="flex w-full max-w-md items-center gap-3 rounded-xl wd-bg-elevated border wd-border-subtle p-3 opacity-60">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--wd-surface-panel)] wd-text-muted">
                <FileTypeIcon
                    mimeType={attachment.mimeType}
                    filename={attachment.originalFileName}
                    size={24}
                />
                <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full wd-bg-elevated border wd-border-subtle wd-text-muted">
                    <Clock size={10} aria-hidden="true" />
                </div>
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium wd-text-secondary">
                    {attachment.originalFileName}
                </div>
                <div className="text-xs wd-text-muted">
                    This file has expired
                </div>
            </div>
        </div>
    );
}
