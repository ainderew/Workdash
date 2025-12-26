import React from "react";
import { Twitter } from "lucide-react";

interface TwitterPreviewProps {
    username: string;
    twitterId: string;
    url: string;
}

export function TwitterPreview({ username, twitterId, url }: TwitterPreviewProps) {
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
                className="block max-w-md rounded-lg overflow-hidden border border-neutral-700 hover:border-sky-500/50 transition-colors group"
            >
                <div className="bg-neutral-800 p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <Twitter className="w-5 h-5 text-white" fill="white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">
                                    @{username}
                                </span>
                                <svg className="w-4 h-4 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">
                                View post on X (Twitter)
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-neutral-900 px-4 py-2 border-t border-neutral-700">
                    <span className="text-xs text-neutral-500">
                        Post ID: {twitterId.slice(0, 12)}...
                    </span>
                </div>
            </a>
        </div>
    );
}
