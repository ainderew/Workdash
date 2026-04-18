import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { ChatV2Attachment } from "@/communication/chatV2/_types";
import { formatDurationMs } from "@/communication/chatV2/fileCategories";
import {
    getChatFilePosterUrl,
    getChatFilePreviewUrl,
} from "@/communication/chatV2/uploadService";
import { invalidateCachedUrl } from "@/communication/chatV2/urlCacheService";
import { BlurhashCanvas } from "./BlurhashCanvas";

interface AttachmentVideoPlayerProps {
    attachment: ChatV2Attachment;
    viewUrl: string | null;
    posterUrl: string | null;
}

const DEFAULT_ASPECT = "16 / 9";

export function AttachmentVideoPlayer({
    attachment,
    viewUrl,
    posterUrl,
}: AttachmentVideoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [resolvedView, setResolvedView] = useState<string | null>(viewUrl);
    const [resolvedPoster, setResolvedPoster] = useState<string | null>(
        posterUrl,
    );
    const [playbackError, setPlaybackError] = useState<string | null>(null);

    useEffect(() => {
        setResolvedView(viewUrl);
    }, [viewUrl]);
    useEffect(() => {
        setResolvedPoster(posterUrl);
    }, [posterUrl]);

    const handlePlay = useCallback(async () => {
        if (resolvedView) {
            setIsPlaying(true);
            return;
        }
        try {
            const url = await getChatFilePreviewUrl(attachment.id);
            setResolvedView(url);
            setIsPlaying(true);
        } catch (error) {
            setPlaybackError(
                error instanceof Error ? error.message : "Failed to load video",
            );
        }
    }, [attachment.id, resolvedView]);

    const handlePosterError = useCallback(async () => {
        invalidateCachedUrl(attachment.id);
        try {
            const refreshed = await getChatFilePosterUrl(attachment.id);
            if (refreshed) setResolvedPoster(refreshed);
        } catch {
            // leave poster blank; play button still works
        }
    }, [attachment.id]);

    const handleVideoError = useCallback(() => {
        setPlaybackError("Playback failed — try downloading the file instead.");
        setIsPlaying(false);
    }, []);

    const aspect =
        attachment.width && attachment.height
            ? `${attachment.width} / ${attachment.height}`
            : DEFAULT_ASPECT;

    const containerStyle: React.CSSProperties = {
        maxWidth: "520px",
        aspectRatio: aspect,
    };

    if (isPlaying && resolvedView) {
        return (
            <div
                style={containerStyle}
                className="relative overflow-hidden rounded-lg wd-bg-elevated"
            >
                <video
                    src={resolvedView}
                    poster={resolvedPoster ?? undefined}
                    controls
                    autoPlay
                    preload="metadata"
                    onError={handleVideoError}
                    className="h-full w-full"
                />
                {playbackError && (
                    <div className="absolute bottom-2 left-2 right-2 rounded bg-[var(--wd-danger-soft)] px-2 py-1 text-xs wd-text-danger">
                        {playbackError}
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => void handlePlay()}
            style={containerStyle}
            className="relative block overflow-hidden rounded-lg wd-bg-elevated wd-ring-focus"
            aria-label={`Play ${attachment.originalFileName}`}
        >
            <BlurhashCanvas
                blurhash={attachment.blurhash}
                className="absolute inset-0 h-full w-full"
            />
            {resolvedPoster && (
                <Image
                    src={resolvedPoster}
                    alt={attachment.originalFileName}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 520px"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={handlePosterError}
                />
            )}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--wd-accent)]/90 text-white shadow-lg">
                    <Play size={24} aria-hidden="true" />
                </div>
            </div>
            {attachment.durationMs ? (
                <div className="pointer-events-none absolute bottom-1 left-2 rounded bg-[var(--wd-lightbox-overlay)]/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {formatDurationMs(attachment.durationMs)}
                </div>
            ) : null}
            {playbackError && (
                <div className="absolute bottom-2 left-2 right-2 rounded bg-[var(--wd-danger-soft)] px-2 py-1 text-xs wd-text-danger">
                    {playbackError}
                </div>
            )}
        </button>
    );
}
