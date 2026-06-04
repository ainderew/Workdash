import { useEffect, useState } from "react";

/** Returns whole-second countdown remaining until `expiresAt`. Returns 0 once elapsed. */
export function useReadyCheckCountdown(expiresAt: string | null): number {
    const compute = (): number => {
        if (!expiresAt) return 0;
        const ms = new Date(expiresAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(ms / 1000));
    };

    const [remaining, setRemaining] = useState<number>(compute);

    useEffect(() => {
        if (!expiresAt) {
            setRemaining(0);
            return;
        }
        setRemaining(compute());
        const id = setInterval(() => setRemaining(compute()), 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    return remaining;
}
