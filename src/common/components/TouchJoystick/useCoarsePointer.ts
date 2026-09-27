import { useEffect, useState } from "react";

const QUERY = "(pointer: coarse)";

/** True when the main pointer is a finger (phones, tablets). */
export default function useCoarsePointer(): boolean {
    const [coarse, setCoarse] = useState(
        () => typeof window !== "undefined" && !!window.matchMedia?.(QUERY).matches,
    );

    useEffect(() => {
        const media = window.matchMedia?.(QUERY);
        if (!media) return;
        const update = () => setCoarse(media.matches);
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    return coarse;
}
