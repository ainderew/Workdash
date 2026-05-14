import { useCallback, useEffect, useState } from "react";
import { pushService } from "@/communication/push/pushService";

type PushState =
    | "unsupported"
    | "denied"
    | "default"
    | "subscribed"
    | "unsubscribed";

export function usePushNotifications() {
    const [state, setState] = useState<PushState>("unsupported");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!pushService.isSupported()) {
            setState("unsupported");
            return;
        }
        if (Notification.permission === "denied") {
            setState("denied");
            return;
        }
        try {
            const subscription = await pushService.getCurrentSubscription();
            if (subscription) {
                setState("subscribed");
            } else {
                setState(
                    Notification.permission === "granted"
                        ? "unsubscribed"
                        : "default",
                );
            }
        } catch {
            setState("unsubscribed");
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const subscribe = useCallback(async () => {
        setError(null);
        setBusy(true);
        try {
            await pushService.subscribe();
            setState("subscribed");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to subscribe");
            if (Notification.permission === "denied") {
                setState("denied");
            }
        } finally {
            setBusy(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setError(null);
        setBusy(true);
        try {
            await pushService.unsubscribe();
            setState("unsubscribed");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to unsubscribe");
        } finally {
            setBusy(false);
        }
    }, []);

    return { state, busy, error, subscribe, unsubscribe, refresh } as const;
}
