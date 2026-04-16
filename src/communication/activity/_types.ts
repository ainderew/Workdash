import type { ActivitySource } from "./_sources";

export type ActivityType = "listening" | "watching" | "playing" | "custom";

type ActivityBase = {
    /** Stable slot key — one activity per source per user. */
    source: ActivitySource;
    startedAt: number;
};

export type ListeningActivity = ActivityBase & {
    type: "listening";
    title: string;
};

export type WatchingActivity = ActivityBase & {
    type: "watching";
    title: string;
};

export type PlayingActivity = ActivityBase & {
    type: "playing";
    title: string;
};

export type CustomActivity = ActivityBase & {
    type: "custom";
    text: string;
    emoji: string;
};

export type UserActivity =
    | ListeningActivity
    | WatchingActivity
    | PlayingActivity
    | CustomActivity;

/** Runtime validator used at the socket boundary. Returns null on invalid. */
export function validateUserActivity(raw: unknown): UserActivity | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.source !== "string") return null;
    if (typeof r.startedAt !== "number") return null;
    if (r.type === "listening" || r.type === "watching" || r.type === "playing") {
        if (typeof r.title !== "string") return null;
        return r as unknown as UserActivity;
    }
    if (r.type === "custom") {
        if (typeof r.text !== "string") return null;
        if (typeof r.emoji !== "string") return null;
        return r as unknown as UserActivity;
    }
    return null;
}
