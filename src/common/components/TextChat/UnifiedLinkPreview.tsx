import React, { useState } from "react";
import { extractDomain, getYouTubeThumbnail } from "@/common/utils/linkParser";
import type { LinkPreviewMetadata } from "@/common/hooks/useLinkPreviews";
import {
    getPlatformIcon,
    getPlatformGradient,
    type PlatformType,
} from "./platformIcons";

interface UnifiedLinkPreviewProps {
    url: string;
    platform: PlatformType;
    metadata: LinkPreviewMetadata | null | undefined;
    platformHints?: {
        youtubeId?: string;
        githubType?: "repo" | "issue" | "pull";
    };
}

const isFacebookVideoUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        const normalizedHost = parsed.hostname
            .toLowerCase()
            .replace(/^www\./, "");
        const normalizedPath = parsed.pathname.toLowerCase();

        if (normalizedHost === "fb.watch") return true;
        if (!normalizedHost.endsWith("facebook.com")) return false;
        if (normalizedPath.includes("/reel/")) return true;
        if (normalizedPath.includes("/videos/")) return true;
        if (normalizedPath === "/watch/" || normalizedPath === "/watch")
            return true;

        return false;
    } catch {
        return false;
    }
};

const getFacebookEmbedUrl = (value: string) =>
    `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        value,
    )}&show_text=false&width=560`;

function ImageFallback({ platform }: { platform: PlatformType }) {
    const Icon = getPlatformIcon(platform);
    const gradient = getPlatformGradient(platform);

    return (
        <div
            className={`h-56 w-full bg-gradient-to-br ${gradient} flex items-center justify-center border-b wd-border-subtle`}
        >
            <Icon size={48} />
        </div>
    );
}

export function UnifiedLinkPreview({
    url,
    platform,
    metadata,
    platformHints,
}: UnifiedLinkPreviewProps) {
    const displayUrl = metadata?.url || url;
    const domain = metadata?.domain || extractDomain(displayUrl);
    const title = metadata?.title || metadata?.siteName;
    const description = metadata?.description;
    const Icon = getPlatformIcon(platform);

    const isFbVideo = platform === "facebook" || isFacebookVideoUrl(url);

    let imageSrc = metadata?.image;
    if (!imageSrc && platform === "youtube" && platformHints?.youtubeId) {
        imageSrc = getYouTubeThumbnail(platformHints.youtubeId);
    }

    if (isFbVideo) {
        return (
            <div className="mt-2 block max-w-md overflow-hidden rounded-md border wd-border-subtle wd-bg-elevated">
                <div className="aspect-video w-full bg-black">
                    <iframe
                        src={getFacebookEmbedUrl(displayUrl)}
                        title={title || "Facebook video"}
                        className="h-full w-full border-0"
                        loading="lazy"
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>
                <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 transition-colors hover:bg-[var(--wd-surface-base)]"
                >
                    <div className="flex items-center gap-1.5">
                        <Icon size={16} />
                        <span className="text-xs wd-text-muted truncate">
                            {domain}
                        </span>
                    </div>
                    {title && (
                        <p className="mt-1 text-sm wd-text-primary font-medium line-clamp-2">
                            {title}
                        </p>
                    )}
                    {description && (
                        <p className="mt-1 text-xs wd-text-secondary line-clamp-3">
                            {description}
                        </p>
                    )}
                </a>
            </div>
        );
    }

    const [imgFailed, setImgFailed] = useState(false);
    const showImage = !!imageSrc && !imgFailed;

    return (
        <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-2 block max-w-md overflow-hidden rounded-md border wd-border-subtle wd-bg-elevated transition-colors hover:bg-[var(--wd-surface-base)]  before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-amber-500 before:content-['']"
        >
            {showImage ? (
                <img
                    src={imageSrc}
                    alt={title || domain}
                    loading="lazy"
                    className="h-56 w-full object-contain border-b wd-border-subtle"
                    onError={() => setImgFailed(true)}
                />
            ) : (
                <ImageFallback platform={platform} />
            )}
            <div className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <Icon size={16} />
                    <span className="text-xs wd-text-muted truncate">
                        {domain}
                    </span>
                </div>
                {title && (
                    <p className="mt-1 text-sm wd-text-primary font-medium line-clamp-2">
                        {title}
                    </p>
                )}
                {description && (
                    <p className="mt-1 text-xs wd-text-secondary line-clamp-3">
                        {description}
                    </p>
                )}
            </div>
        </a>
    );
}
