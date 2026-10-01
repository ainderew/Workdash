import { useEffect, useState } from "react";

/**
 * Whether a CSS media query currently matches, updated live as the viewport
 * changes. Reads the query on first render so phones don't flash the desktop
 * layout for a frame (the app shell is client-only, so `window` is there).
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(
        () => typeof window !== "undefined" && window.matchMedia(query).matches,
    );

    useEffect(() => {
        const mql = window.matchMedia(query);
        const update = () => setMatches(mql.matches);
        update();
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
    }, [query]);

    return matches;
}
