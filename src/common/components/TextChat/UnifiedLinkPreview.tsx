import React, { useState } from "react";
import { extractDomain, getYouTubeThumbnail } from "@/common/utils/linkParser";
import {
    isWeakMetadata,
    type LinkPreviewMetadata,
} from "@/common/hooks/useLinkPreviews";
import {
    getPlatformIcon,
    getPlatformGradient,
    type PlatformType,
} from "./platformIcons";
import { RichLinkCard, type RichLinkRef } from "./RichLinkCard";

interface UnifiedLinkPreviewProps {
    url: string;
    platform: PlatformType;
    metadata: LinkPreviewMetadata | null | undefined;
    platformHints?: {
        youtubeId?: string;
        githubType?: "repo" | "issue" | "pull";
        githubOwner?: string;
        githubRepo?: string;
        githubNumber?: string;
        jiraKey?: string;
        linearKey?: string;
    };
}

function buildRichRef(
    platform: PlatformType,
    hints: UnifiedLinkPreviewProps["platformHints"],
): RichLinkRef | null {
    if (platform === "github" && hints?.githubOwner && hints?.githubRepo) {
        const identifier = `${hints.githubOwner}/${hints.githubRepo}`;
        const num = hints.githubNumber;
        const badge =
            hints.githubType === "pull"
                ? num
                    ? `PR #${num}`
                    : "PR"
                : hints.githubType === "issue"
                  ? num
                      ? `Issue #${num}`
                      : "Issue"
                  : "Repo";
        return { provider: "github", identifier, badge };
    }
    if (platform === "jira" && hints?.jiraKey) {
        return {
            provider: "jira",
            identifier: hints.jiraKey.toUpperCase(),
            badge: "Issue",
        };
    }
    if (platform === "linear" && hints?.linearKey) {
        return {
            provider: "linear",
            identifier: hints.linearKey.toUpperCase(),
            badge: "Issue",
        };
    }
    return null;
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
    // GitHub / Jira / Linear render a structured card from the parsed
    // identifier, so they show even when OG metadata is missing or weak.
    const richRef = buildRichRef(platform, platformHints);
    if (richRef) {
        return <RichLinkCard url={url} reference={richRef} metadata={metadata} />;
    }

    if (platform !== "youtube" && (!metadata || isWeakMetadata(metadata))) {
        return null;
    }

    const displayUrl = metadata?.url || url;
    const domain = metadata?.domain || extractDomain(displayUrl);
    const title = metadata?.title || metadata?.siteName;
    const description = metadata?.description;
    const Icon = getPlatformIcon(platform);

    const [imgFailed, setImgFailed] = useState(false);

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

    const showImage = !!imageSrc && !imgFailed;

    return (
        <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block max-w-md overflow-hidden rounded-xl border wd-border-subtle wd-bg-elevated transition-colors duration-150 motion-reduce:transition-none hover:bg-[var(--wd-surface-base)] hover:wd-border-strong"
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
