import React, { useEffect, useState } from "react";
import { ScreenShareViewer } from "@/communication/screenShare/screenShareViewer";
import ScreenShareContainer from "./ScreenShareContainer";

type VideoState = {
    producerId: string;
    isExpanded: boolean;
    ownerName: string;
};

interface ScreenShareUiProps {
    isGameReady: boolean;
}

function ScreenShareUi({ isGameReady }: ScreenShareUiProps) {
    const [videosTracked, setVideosTracked] = useState<VideoState[]>([]);

    useEffect(() => {
        const service = ScreenShareViewer.getInstance();

        function updateScreenState() {
            const vidArray = Array.from(service.videoElements.keys());

            setVideosTracked((prev) => {
                const prevKeys = prev.map((v) => v.producerId).sort().join(",");
                const nextKeys = [...vidArray].sort().join(",");
                const ownersSame = prev.every(
                    (v) => service.videoOwnerMap[v.producerId] === v.ownerName,
                );
                if (prevKeys === nextKeys && ownersSame) return prev;

                return vidArray.map((vid) => {
                    const existing = prev.find((v) => v.producerId === vid);
                    return {
                        producerId: vid,
                        isExpanded: existing?.isExpanded ?? false,
                        ownerName: service.videoOwnerMap[vid] ?? "Unknown User",
                    };
                });
            });
        }

        const unsubscribe = service.subscribe(updateScreenState);
        updateScreenState();

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (isGameReady) {
            const service = ScreenShareViewer.getInstance();
            service.loadExistingProducers();
        }
    }, [isGameReady]);

    useEffect(() => {
        if (!videosTracked.length) return;

        const service = ScreenShareViewer.getInstance();

        videosTracked.forEach((video) => {
            const container = document.getElementById(video.producerId);
            const videoEl = service.videoElements.get(video.producerId);

            if (container && videoEl && !container.contains(videoEl)) {
                container.innerHTML = "";
                container.appendChild(videoEl);

                videoEl.style.width = "100%";
                videoEl.style.height = "100%";
                videoEl.style.objectFit = "contain";
            }
        });
    }, [videosTracked]);

    function handleExpand(producerId: string) {
        setVideosTracked((prev) => {
            return prev.map((video) => ({
                ...video,
                isExpanded:
                    video.producerId === producerId ? !video.isExpanded : false,
            }));
        });
    }

    const expandedVideo = videosTracked.find((v) => v.isExpanded);
    const collapsedVideos = videosTracked.filter((v) => !v.isExpanded);
    const hasExpandedVideo = !!expandedVideo;

    if (videosTracked.length === 0) {
        return null;
    }

    return (
        <>
            {expandedVideo && (
                <ScreenShareContainer
                    key={`expanded-${expandedVideo.producerId}`}
                    producerId={expandedVideo.producerId}
                    isExpanded={true}
                    handleExpand={handleExpand}
                    ownerName={expandedVideo.ownerName}
                />
            )}

            <div
                className={`
                     absolute flex gap-4 transition-all duration-300 ease-in-out z-90
                    ${
                        hasExpandedVideo
                            ? "left-10 top-1/2 -translate-y-1/2 flex-col"
                            : "top-5 left-5 flex-col"
                    }
                    ${hasExpandedVideo && collapsedVideos.length > 3 ? "overflow-y-auto max-h-[80vh]" : ""}
                `}
            >
                {collapsedVideos.map((video) => (
                    <ScreenShareContainer
                        key={`collapsed-${video.producerId}`}
                        producerId={video.producerId}
                        isExpanded={false}
                        handleExpand={handleExpand}
                        ownerName={video.ownerName}
                    />
                ))}
            </div>

            {hasExpandedVideo && collapsedVideos.length > 0 && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium z-90 border wd-border-subtle wd-text-primary" style={{ backgroundColor: "var(--wd-surface-overlay)" }}>
                    {collapsedVideos.length} more{" "}
                    {collapsedVideos.length === 1 ? "share" : "shares"}
                </div>
            )}
        </>
    );
}

export default ScreenShareUi;
