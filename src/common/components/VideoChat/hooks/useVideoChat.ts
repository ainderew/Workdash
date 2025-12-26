import { VideoChatViewer } from "@/communication/videoChat/videoChatViewer";
import { useEffect, useState } from "react";
import { VideoState } from "../_types";

function useVideoChat(isGameReady: boolean) {
    const [videosTracked, setVideosTracked] = useState<VideoState[]>([]);

    useEffect(() => {
        const service = VideoChatViewer.getInstance();

        function updateScreenState() {
            const vidArray = Array.from(service.videoElements.keys());

            setVideosTracked((prev) => {
                const newVideos = vidArray.map((vid) => {
                    const existing = prev.find((v) => v.producerId === vid);
                    return {
                        producerId: vid,
                        isExpanded: existing?.isExpanded ?? false,
                    };
                });

                return newVideos;
            });
        }

        service.updateComponentStateCallback = updateScreenState;
        updateScreenState();

        return () => {
            service.updateComponentStateCallback = null;
        };
    }, []);

    useEffect(() => {
        if (isGameReady) {
            const service = VideoChatViewer.getInstance();
            service.loadExistingProducers();
        }
    }, [isGameReady]);

    useEffect(() => {
        if (!videosTracked.length) return;

        const service = VideoChatViewer.getInstance();

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

    return {
        videosTracked,
        handleExpand,
    };
}

export default useVideoChat;
