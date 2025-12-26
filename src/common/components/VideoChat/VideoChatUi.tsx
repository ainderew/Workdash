import React from "react";
import VideoChatContainer from "./VideoChatContainer";
import useVideoChat from "./hooks/useVideoChat";

interface VideoChatUiProps {
    isGameReady: boolean;
}

function VideoChatUi({ isGameReady }: VideoChatUiProps) {
    const { videosTracked, handleExpand } = useVideoChat(isGameReady);

    const expandedVideo = videosTracked.find((v) => v.isExpanded);
    const collapsedVideos = videosTracked.filter((v) => !v.isExpanded);
    const hasExpandedVideo = !!expandedVideo;

    if (videosTracked.length === 0) {
        return null;
    }

    return (
        <>
            {expandedVideo && (
                <VideoChatContainer
                    key={`expanded-${expandedVideo.producerId}`}
                    producerId={expandedVideo.producerId}
                    isExpanded={true}
                    handleExpand={handleExpand}
                    hasMoreThanOneSharing={videosTracked.length > 1}
                />
            )}

            <div
                className={`
                    fixed flex gap-4 transition-all duration-300 ease-in-out z-90
                    ${
                        hasExpandedVideo
                            ? "left-10 top-1/2 -translate-y-1/2 flex-col"
                            : "top-5 left-1/2 -translate-x-1/2 flex"
                    }
                    ${hasExpandedVideo && collapsedVideos.length > 3 ? "overflow-x-auto max-w-[90vw]" : ""}
                `}
            >
                {collapsedVideos.map((video) => (
                    <VideoChatContainer
                        key={`collapsed-${video.producerId}`}
                        producerId={video.producerId}
                        isExpanded={false}
                        handleExpand={handleExpand}
                        hasMoreThanOneSharing={videosTracked.length > 1}
                    />
                ))}
            </div>

            {hasExpandedVideo && collapsedVideos.length > 0 && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium z-90 border border-white/20">
                    {collapsedVideos.length} more{" "}
                    {collapsedVideos.length === 1 ? "share" : "shares"}
                </div>
            )}
        </>
    );
}

export default VideoChatUi;
