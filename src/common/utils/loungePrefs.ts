export type LoungeHours = { startHour: number; endHour: number };

export const DEFAULT_LOUNGE_HOURS: LoungeHours = { startHour: 19, endHour: 1 };

const HOURS_KEY = "workdash:lounge:hours";
const SNOOZE_KEY = "workdash:lounge:snoozeUntil";
const QUORUM_NIGHT_KEY = "workdash:lounge:lastQuorumNightKey";
const LIVE_NUDGE_KEY = "workdash:lounge:lastLiveNudgeCallStart";
const NUDGES_ENABLED_KEY = "workdash:lounge:nudgesEnabled";
const AUTO_JOIN_KEY = "workdash:lounge:autoJoin";

/** Hour of the morning at which a "Not tonight" snooze expires. */
const SNOOZE_RESET_HOUR = 6;

const readString = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeString = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage unavailable — prefs silently fall back to defaults
    }
};

export function getLoungeHours(): LoungeHours {
    const raw = readString(HOURS_KEY);
    if (!raw) return DEFAULT_LOUNGE_HOURS;
    try {
        const parsed = JSON.parse(raw) as Partial<LoungeHours>;
        if (
            typeof parsed.startHour === "number" &&
            typeof parsed.endHour === "number"
        ) {
            return { startHour: parsed.startHour, endHour: parsed.endHour };
        }
    } catch {
        // corrupted — fall through to default
    }
    return DEFAULT_LOUNGE_HOURS;
}

export function setLoungeHours(hours: LoungeHours): void {
    writeString(HOURS_KEY, JSON.stringify(hours));
}

export function areNudgesEnabled(): boolean {
    return readString(NUDGES_ENABLED_KEY) !== "false";
}

export function setNudgesEnabled(enabled: boolean): void {
    writeString(NUDGES_ENABLED_KEY, String(enabled));
}

export function isAutoJoinEnabled(): boolean {
    return readString(AUTO_JOIN_KEY) === "true";
}

export function setAutoJoinEnabled(enabled: boolean): void {
    writeString(AUTO_JOIN_KEY, String(enabled));
}

/** A window like 19→1 crosses midnight; 9→17 does not. */
export function isWithinLoungeHours(now: Date, hours: LoungeHours): boolean {
    const h = now.getHours();
    if (hours.startHour === hours.endHour) return true;
    if (hours.startHour < hours.endHour) {
        return h >= hours.startHour && h < hours.endHour;
    }
    return h >= hours.startHour || h < hours.endHour;
}

export function isSnoozed(now: Date): boolean {
    const raw = readString(SNOOZE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && now.getTime() < until;
}

export function snoozeUntilMorning(now: Date): void {
    const until = new Date(now);
    if (now.getHours() >= SNOOZE_RESET_HOUR) {
        until.setDate(until.getDate() + 1);
    }
    until.setHours(SNOOZE_RESET_HOUR, 0, 0, 0);
    writeString(SNOOZE_KEY, String(until.getTime()));
}

/**
 * Identifies the "night" a timestamp belongs to: anything before the morning
 * reset counts as the previous calendar day's night, so a 00:30 nudge and a
 * 23:00 nudge on the same evening share one key.
 */
export function nightKeyFor(now: Date): string {
    const d = new Date(now);
    if (d.getHours() < SNOOZE_RESET_HOUR) {
        d.setDate(d.getDate() - 1);
    }
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

export function getLastQuorumNightKey(): string | null {
    return readString(QUORUM_NIGHT_KEY);
}

export function setLastQuorumNightKey(key: string): void {
    writeString(QUORUM_NIGHT_KEY, key);
}

export function getLastLiveNudgeCallStart(): string | null {
    return readString(LIVE_NUDGE_KEY);
}

export function setLastLiveNudgeCallStart(startedAt: string): void {
    writeString(LIVE_NUDGE_KEY, startedAt);
}

export const LOUNGE_PREF_STORAGE_KEYS = [
    HOURS_KEY,
    SNOOZE_KEY,
    QUORUM_NIGHT_KEY,
    LIVE_NUDGE_KEY,
    NUDGES_ENABLED_KEY,
    AUTO_JOIN_KEY,
] as const;
