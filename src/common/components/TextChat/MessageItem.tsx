import React, { useMemo } from "react";
import type { Message } from "@/communication/textChat/_types";
import { parseMessageContent, extractDomain } from "@/common/utils/linkParser";
import { YouTubePreview } from "./YouTubePreview";
import { TwitterPreview } from "./TwitterPreview";
import { GitHubPreview } from "./GitHubPreview";
import { ExternalLink, Clock, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextChatService } from "@/communication/textChat/textChat";

interface MessageItemProps {
    message: Message;
    showAvatar: boolean;
}

function MessageItem({ message, showAvatar }: MessageItemProps) {
    const textChatService = useMemo(() => TextChatService.getInstance(), []);

    const isPending = message.status === "pending";
    const isFailed = message.status === "failed";

    const handleRetry = () => {
        if (message.clientId) {
            textChatService.retryMessage(message.clientId);
        }
    };

    const formatTime = (date: Date | string) => {
        const d = typeof date === "string" ? new Date(date) : date;
        return d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (id: string) => {
        const colors = [
            "bg-blue-600",
            "bg-green-600",
            "bg-purple-600",
            "bg-pink-600",
            "bg-orange-600",
            "bg-cyan-600",
        ];
        const index = id
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    const avatarBackgroundStyles = useMemo((): React.CSSProperties => {
        const avatarImg = message?.senderSpriteSheet;

        if (avatarImg) {
            return {
                backgroundImage: `url('${avatarImg}')`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "-94px -20px",
                imageRendering: "pixelated" as const,
            };
        }

        return {};
    }, [message?.senderSpriteSheet]);

    return (
        <div
            className={`flex gap-3 hover:bg-neutral-800/30 -mx-2 px-2 rounded ${showAvatar ? "py-3 mt-2" : "py-1"} ${isPending ? "opacity-60" : ""} ${isFailed ? "opacity-50 bg-red-900/10" : ""}`}
        >
            <div className="flex-shrink-0 flex items-start pt-1 w-10">
                {showAvatar ? (
                    <div className="relative">
                        <div
                            className={`w-10 h-10 rounded-md border-2 border-sky-600 shadow-[0_0_10px_rgba(2,132,199,0.5)] flex items-center justify-center text-white font-semibold text-sm bg-neutral-700 overflow-hidden ${!avatarBackgroundStyles.backgroundImage ? getAvatarColor(message.senderSocketId) : ""}`}
                            style={avatarBackgroundStyles}
                        >
                            {!avatarBackgroundStyles.backgroundImage && (
                                <span className="select-none">
                                    {getInitials(message.name)}
                                </span>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="flex-1 min-w-0">
                {showAvatar && (
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sky-600 text-sm">
                            {message.name}
                        </span>
                        <span className="text-xs text-neutral-400">
                            {formatTime(message.createdAt)}
                        </span>
                        {isPending && (
                            <Clock className="w-3 h-3 text-neutral-400 animate-spin" />
                        )}
                        {isFailed && (
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span className="text-xs text-red-400">
                                    Failed to send
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Text Message with Link Detection */}
                {(!message.type || message.type === "text") && (
                    <div className="text-neutral-200 text-sm break-words leading-relaxed">
                        {message.linkMetadata &&
                        message.linkMetadata.length > 0 ? (
                            // Use linkMetadata if available (new messages with fetched metadata)
                            <>
                                {/* Display text content without URLs */}
                                <div className="mb-2">
                                    {message.content
                                        .split(/(https?:\/\/[^\s]+)/g)
                                        .map((part, index) => {
                                            if (part.match(/^https?:\/\//)) {
                                                return null; // Skip URLs, they'll be shown in previews
                                            }
                                            return (
                                                <span key={index}>{part}</span>
                                            );
                                        })
                                        .filter(Boolean)}
                                </div>

                                {/* Display link previews */}
                                {message.linkMetadata.map((metadata, index) => {
                                    if (
                                        metadata.type === "youtube" &&
                                        metadata.youtubeId
                                    ) {
                                        return (
                                            <YouTubePreview
                                                key={index}
                                                videoId={metadata.youtubeId}
                                                url={metadata.url}
                                                title={metadata.title}
                                                description={
                                                    metadata.description
                                                }
                                            />
                                        );
                                    }
                                    return null;
                                })}
                            </>
                        ) : (
                            // Fallback to parseMessageContent for old messages
                            parseMessageContent(message.content).map(
                                (part, index) => {
                                    if (
                                        part.type === "youtube" &&
                                        part.youtubeId
                                    ) {
                                        return (
                                            <YouTubePreview
                                                key={index}
                                                videoId={part.youtubeId}
                                                url={part.url!}
                                            />
                                        );
                                    } else if (
                                        part.type === "twitter" &&
                                        part.twitterUsername &&
                                        part.twitterId
                                    ) {
                                        return (
                                            <TwitterPreview
                                                key={index}
                                                username={part.twitterUsername}
                                                twitterId={part.twitterId}
                                                url={part.url!}
                                            />
                                        );
                                    } else if (
                                        part.type === "github" &&
                                        part.githubOwner &&
                                        part.githubRepo &&
                                        part.githubType
                                    ) {
                                        return (
                                            <GitHubPreview
                                                key={index}
                                                owner={part.githubOwner}
                                                repo={part.githubRepo}
                                                url={part.url!}
                                                type={part.githubType}
                                                issueNumber={
                                                    part.githubIssueNumber
                                                }
                                            />
                                        );
                                    } else if (
                                        part.type === "link" &&
                                        part.url
                                    ) {
                                        return (
                                            <a
                                                key={index}
                                                href={part.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sky-500 hover:text-sky-400 underline inline-flex items-center gap-1 transition-colors"
                                            >
                                                {extractDomain(part.url)}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        );
                                    } else {
                                        return (
                                            <span key={index}>
                                                {part.content}
                                            </span>
                                        );
                                    }
                                },
                            )
                        )}
                    </div>
                )}

                {/* GIF Message */}
                {message.type === "gif" && message.gifUrl && (
                    <div className="mt-1">
                        <img
                            src={message.gifUrl}
                            alt="GIF"
                            className="rounded-lg max-w-xs max-h-64 object-contain"
                        />
                    </div>
                )}

                {/* Image Message */}
                {message.type === "image" && message.imageUrl && (
                    <div className="mt-1">
                        <img
                            src={message.imageUrl}
                            alt="Uploaded image"
                            className="rounded-lg max-w-md max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() =>
                                window.open(message.imageUrl, "_blank")
                            }
                        />
                    </div>
                )}

                {/* Retry Button for Failed Messages */}
                {isFailed && message.clientId && (
                    <Button
                        onClick={handleRetry}
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                        <RotateCw className="w-3 h-3 mr-1" />
                        Retry
                    </Button>
                )}
            </div>
        </div>
    );
}

export default MessageItem;
