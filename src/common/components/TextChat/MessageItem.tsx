import React, { useMemo } from "react";
import type { Message } from "@/communication/textChat/_types";

interface MessageItemProps {
    message: Message;
    showAvatar: boolean;
}

function MessageItem({ message, showAvatar }: MessageItemProps) {
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
            className={`flex gap-3 hover:bg-neutral-800/30 -mx-2 px-2 rounded ${showAvatar ? "py-3 mt-2" : "py-1"}`}
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
                        {/* Status Indicator Dot */}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-neutral-800 bg-sky-600 z-10" />
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
                    </div>
                )}

                {/* Text Message */}
                {(!message.type || message.type === "text") && (
                    <p className="text-neutral-200 text-sm break-words leading-relaxed">
                        {message.content}
                    </p>
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
            </div>
        </div>
    );
}

export default MessageItem;
