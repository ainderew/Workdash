import { useActivityStore } from "@/common/store/activityStore";
import { validateUserActivity, type UserActivity } from "./_types";

function logInvalidPayload(event: string, payload: unknown): void {
    console.error(`[activity] Invalid ${event} payload`, payload);
}

export class ActivityClientService {
    private static instance: ActivityClientService | null = null;
    private socket: SocketIOClient.Socket | null = null;
    private listening = false;

    static getInstance(): ActivityClientService {
        if (!ActivityClientService.instance) {
            ActivityClientService.instance = new ActivityClientService();
        }
        return ActivityClientService.instance;
    }

    init(socket: SocketIOClient.Socket): ActivityClientService {
        this.socket = socket;
        return this;
    }

    setupListeners(): void {
        if (this.listening || !this.socket) return;
        this.listening = true;

        this.socket.on("activity:set", (payload: unknown) => {
            const parsed = parseActivitySet(payload);
            if (!parsed) {
                logInvalidPayload("activity:set", payload);
                return;
            }
            useActivityStore
                .getState()
                .setActivity(parsed.workspaceId, parsed.userId, parsed.activity);
        });

        this.socket.on("activity:clear", (payload: unknown) => {
            const parsed = parseActivityClear(payload);
            if (!parsed) {
                logInvalidPayload("activity:clear", payload);
                return;
            }
            useActivityStore
                .getState()
                .clearActivity(parsed.workspaceId, parsed.userId, parsed.source);
        });

        this.socket.on("activity:clear-all", (payload: unknown) => {
            const parsed = parseActivityClearAll(payload);
            if (!parsed) {
                logInvalidPayload("activity:clear-all", payload);
                return;
            }
            useActivityStore
                .getState()
                .clearAllActivities(parsed.workspaceId, parsed.userId);
        });

        this.socket.on("activity:batch-set", (payload: unknown) => {
            const parsed = parseBatchSet(payload);
            if (!parsed) {
                logInvalidPayload("activity:batch-set", payload);
                return;
            }
            useActivityStore
                .getState()
                .batchSetActivities(parsed.workspaceId, parsed.entries);
        });

        this.socket.on("activity:batch-clear", (payload: unknown) => {
            const parsed = parseBatchClear(payload);
            if (!parsed) {
                logInvalidPayload("activity:batch-clear", payload);
                return;
            }
            useActivityStore
                .getState()
                .batchClearActivities(
                    parsed.workspaceId,
                    parsed.userIds,
                    parsed.source,
                );
        });
    }
}

// --- Payload parsers (frontend-side guard against protocol drift) ---

type ActivitySetPayload = {
    userId: number;
    workspaceId: string;
    source: string;
    activity: UserActivity;
};

function parseActivitySet(raw: unknown): ActivitySetPayload | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.userId !== "number") return null;
    if (typeof r.workspaceId !== "string") return null;
    if (typeof r.source !== "string") return null;
    const activity = validateUserActivity(r.activity);
    if (!activity) return null;
    return {
        userId: r.userId,
        workspaceId: r.workspaceId,
        source: r.source,
        activity,
    };
}

function parseActivityClear(raw: unknown): {
    userId: number;
    workspaceId: string;
    source: string;
} | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.userId !== "number") return null;
    if (typeof r.workspaceId !== "string") return null;
    if (typeof r.source !== "string") return null;
    return { userId: r.userId, workspaceId: r.workspaceId, source: r.source };
}

function parseActivityClearAll(raw: unknown): {
    userId: number;
    workspaceId: string;
} | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.userId !== "number") return null;
    if (typeof r.workspaceId !== "string") return null;
    return { userId: r.userId, workspaceId: r.workspaceId };
}

function parseBatchSet(raw: unknown): {
    workspaceId: string;
    entries: Array<{ userId: number; activity: UserActivity }>;
} | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.workspaceId !== "string") return null;
    if (!Array.isArray(r.entries)) return null;
    const entries: Array<{ userId: number; activity: UserActivity }> = [];
    for (const entry of r.entries) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        if (typeof e.userId !== "number") continue;
        const activity = validateUserActivity(e.activity);
        if (!activity) continue;
        entries.push({ userId: e.userId, activity });
    }
    return { workspaceId: r.workspaceId, entries };
}

function parseBatchClear(raw: unknown): {
    workspaceId: string;
    userIds: number[];
    source: string;
} | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.workspaceId !== "string") return null;
    if (typeof r.source !== "string") return null;
    if (!Array.isArray(r.userIds)) return null;
    const userIds = r.userIds.filter((u): u is number => typeof u === "number");
    return { workspaceId: r.workspaceId, userIds, source: r.source };
}
