/**
 * Mirror of `workdash-media-server/src/services/activity/activity-sources.ts`.
 * Backend is the source of truth — if you add a new source, add it in both
 * files and `source` fields will line up at compile time across the wire.
 */
export const ACTIVITY_SOURCES = {
    MUSIC: "music",
    DOTA: "dota",
    CUSTOM: "custom",
} as const;

export type ActivitySource =
    (typeof ACTIVITY_SOURCES)[keyof typeof ACTIVITY_SOURCES];
