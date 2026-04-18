import React from "react";
import type { ChatV2Attachment } from "@/communication/chatV2/_types";
import { getFileCategory } from "@/communication/chatV2/fileCategories";
import { AttachmentImageGrid } from "./AttachmentImageGrid";
import { AttachmentVideoPlayer } from "./AttachmentVideoPlayer";
import { AttachmentFileCard } from "./AttachmentFileCard";
import { AttachmentExpiredCard } from "./AttachmentExpiredCard";
import type { AttachmentUrlMap } from "./_types";

interface AttachmentRendererProps {
    attachments: ChatV2Attachment[];
    urlsByFileId: AttachmentUrlMap;
    onImageTileClick: (
        fileId: string,
        fileName: string,
        galleryIndex: number,
    ) => void;
    onDownloadAttachment: (fileId: string, filename: string) => void;
}

type PartitionedAttachments = {
    images: ChatV2Attachment[];
    videos: ChatV2Attachment[];
    files: ChatV2Attachment[];
    expired: ChatV2Attachment[];
};

const partition = (
    attachments: ChatV2Attachment[],
): PartitionedAttachments => {
    const images: ChatV2Attachment[] = [];
    const videos: ChatV2Attachment[] = [];
    const files: ChatV2Attachment[] = [];
    const expired: ChatV2Attachment[] = [];
    for (const attachment of attachments) {
        if (attachment.expiredAt) {
            expired.push(attachment);
            continue;
        }
        if (attachment.isImage) {
            images.push(attachment);
            continue;
        }
        if (getFileCategory(attachment.mimeType) === "video") {
            videos.push(attachment);
            continue;
        }
        files.push(attachment);
    }
    return { images, videos, files, expired };
};

export function AttachmentRenderer({
    attachments,
    urlsByFileId,
    onImageTileClick,
    onDownloadAttachment,
}: AttachmentRendererProps) {
    if (attachments.length === 0) return null;
    const { images, videos, files, expired } = partition(attachments);

    return (
        <div className="mt-2 flex flex-col gap-2">
            {images.length > 0 && (
                <AttachmentImageGrid
                    attachments={images}
                    urlsByFileId={urlsByFileId}
                    onTileClick={(galleryIndex) => {
                        const attachment = images[galleryIndex];
                        if (!attachment) return;
                        onImageTileClick(
                            attachment.id,
                            attachment.originalFileName,
                            galleryIndex,
                        );
                    }}
                />
            )}
            {videos.map((video) => (
                <AttachmentVideoPlayer
                    key={video.id}
                    attachment={video}
                    viewUrl={urlsByFileId[video.id]?.viewUrl ?? null}
                    posterUrl={urlsByFileId[video.id]?.posterUrl ?? null}
                />
            ))}
            {files.map((file) => (
                <AttachmentFileCard
                    key={file.id}
                    attachment={file}
                    viewUrl={urlsByFileId[file.id]?.viewUrl ?? null}
                    onDownload={() =>
                        onDownloadAttachment(file.id, file.originalFileName)
                    }
                />
            ))}
            {expired.map((file) => (
                <AttachmentExpiredCard key={file.id} attachment={file} />
            ))}
        </div>
    );
}
