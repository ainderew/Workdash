import React from "react";
import { Play } from "lucide-react";
import { getYouTubeThumbnail } from "@/common/utils/linkParser";

interface YouTubePreviewProps {
    videoId: string;
    url: string;
    title?: string;
    description?: string;
}

export function YouTubePreview({
    videoId,
    url,
    title,
    description,
}: YouTubePreviewProps) {
    const thumbnailUrl = getYouTubeThumbnail(videoId);

    return (
        <div className="mt-2">
            {/* URL Headline */}
            <div className="mb-1 px-1">
                <p className="text-xs text-neutral-400 truncate">{url}</p>
            </div>

            {/* Preview Card */}
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block max-w-xs rounded-lg overflow-hidden border border-neutral-700 hover:border-neutral-600 transition-colors group"
            >
                <div className="relative">
                    <img
                        src={thumbnailUrl}
                        alt="YouTube video thumbnail"
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                            // Fallback if thumbnail fails to load
                            e.currentTarget.style.display = "none";
                        }}
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-16 h-16 bg-red-600 group-hover:bg-red-700 rounded-full flex items-center justify-center transition-colors">
                            <Play
                                className="w-8 h-8 text-white ml-1"
                                fill="white"
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-neutral-800 p-3">
                    {title && (
                        <p className="text-sm font-semibold text-white mb-2 line-clamp-2">
                            {title}
                        </p>
                    )}
                    <div className="flex items-center gap-2">
                        <svg
                            className="w-5 h-5 text-red-600"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        <span className="text-xs text-neutral-400 truncate">
                            {description || "YouTube Video"}
                        </span>
                    </div>
                </div>
            </a>
        </div>
    );
}
