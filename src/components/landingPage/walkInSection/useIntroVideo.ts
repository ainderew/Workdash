import { useEffect, useRef, type RefObject } from "react";

// The intro clip (desk at night → push through the monitor → map overhead)
// was generated on Higgsfield; see the .mp4.json sidecar for how. It is
// encoded with a keyframe every 6 frames and no B-frames, so scrubbing
// backwards stays smooth.
export const INTRO_VIDEO = "/assets/walk-in-intro.db3fbe1e.mp4";
export const INTRO_POSTER = "/assets/walk-in-intro-poster.99ca325c.webp";

/**
 * Attaches the intro clip once the section is about a screen away, so the
 * page doesn't download it for visitors who never scroll that far. The poster
 * (its first frame) shows until then.
 */
export function useIntroVideo(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        const video = videoRef.current;
        if (!enabled || !root || !video) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                io.disconnect();
                video.src = INTRO_VIDEO;
                video.preload = "auto";
                video.load();
                // iOS Safari won't buffer a video that never plays, and this one
                // is only ever seeked. A muted play-then-pause starts the load.
                video.play().then(() => video.pause()).catch(() => {});
            },
            { rootMargin: "100% 0px" },
        );
        io.observe(root);
        return () => io.disconnect();
    }, [rootRef, enabled]);

    return videoRef;
}
