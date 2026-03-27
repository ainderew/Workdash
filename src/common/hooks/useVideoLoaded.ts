import { useState, useEffect, RefObject } from "react";

/**
 * Watches a container ref for a <video> element to appear (via MutationObserver)
 * and resolves `isLoading` to false once the video fires `loadeddata`.
 * Resets to `true` whenever `key` changes (e.g. a new producerId).
 */
export function useVideoLoaded(
  containerRef: RefObject<HTMLElement | null>,
  key: string,
): boolean {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const handleLoaded = () => {
      if (!disposed) setIsLoading(false);
    };

    const checkVideo = () => {
      const video = container.querySelector("video");
      if (!video) return;
      if (video.readyState >= 2) {
        handleLoaded();
      } else {
        video.addEventListener("loadeddata", handleLoaded, { once: true });
      }
    };

    // Check if video is already present
    checkVideo();

    // Watch for video being appended
    const observer = new MutationObserver(checkVideo);
    observer.observe(container, { childList: true });

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [key]);

  return isLoading;
}
