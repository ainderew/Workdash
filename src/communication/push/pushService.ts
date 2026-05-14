import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
        output[i] = rawData.charCodeAt(i);
    }
    return output;
};

const authHeader = (): HeadersInit => {
    const jwt = tokenStore.getJwt();
    if (!jwt) throw new Error("Missing backend auth token");
    return { Authorization: `Bearer ${jwt}` };
};

export const pushService = {
    isSupported(): boolean {
        return (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        );
    },

    async getPublicKey(): Promise<string> {
        const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (fromEnv) return fromEnv;

        const res = await fetch(`${CONFIG.SFU_SERVER_URL}/api/push/public-key`);
        if (!res.ok) {
            throw new Error("Push notifications are not configured on the server");
        }
        const json = (await res.json()) as { publicKey: string };
        return json.publicKey;
    },

    async getCurrentSubscription(): Promise<PushSubscription | null> {
        const registration = await navigator.serviceWorker.ready;
        return registration.pushManager.getSubscription();
    },

    async subscribe(): Promise<PushSubscription> {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            throw new Error("Notification permission was not granted");
        }

        const publicKey = await this.getPublicKey();
        const registration = await navigator.serviceWorker.ready;

        const existing = await registration.pushManager.getSubscription();
        if (existing) {
            await this.postSubscription(existing);
            return existing;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await this.postSubscription(subscription);
        return subscription;
    },

    async unsubscribe(): Promise<void> {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        await fetch(`${CONFIG.SFU_SERVER_URL}/api/push/unsubscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {
            // Best-effort — still tear down browser-side
        });

        await subscription.unsubscribe();
    },

    async postSubscription(subscription: PushSubscription): Promise<void> {
        const res = await fetch(`${CONFIG.SFU_SERVER_URL}/api/push/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify(subscription.toJSON()),
        });
        if (!res.ok) {
            throw new Error(`Failed to register push subscription: ${res.status}`);
        }
    },
};
