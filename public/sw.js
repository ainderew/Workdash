self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
    // No-op fetch handler — its presence makes the app installable in Chromium browsers.
});

self.addEventListener("push", (event) => {
    let payload = {};
    if (event.data) {
        try {
            payload = event.data.json();
        } catch {
            payload = { title: "WorkDash", body: event.data.text() };
        }
    }

    const title = payload.title || "WorkDash";
    const options = {
        body: payload.body || "",
        icon: payload.icon || "/icon-192.png",
        badge: payload.badge || "/icon-192.png",
        tag: payload.tag,
        renotify: Boolean(payload.tag),
        data: { url: payload.url || "/", ...(payload.data || {}) },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                const clientUrl = new URL(client.url);
                if (clientUrl.origin === self.location.origin) {
                    client.focus();
                    if ("navigate" in client) {
                        return client.navigate(targetUrl);
                    }
                    return;
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        }),
    );
});
