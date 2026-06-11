import { signOut } from "next-auth/react";
import { LOUNGE_PREF_STORAGE_KEYS } from "@/common/utils/loungePrefs";

/**
 * localStorage keys holding account-scoped data. Cleared on sign-out so a
 * different account on the same browser doesn't inherit them. Device-scoped
 * preferences (theme, interaction mode, sidebar state) are deliberately kept.
 */
const USER_SCOPED_STORAGE_KEYS = [
    "user",
    "workdash:defaultWorkspaceId",
    "workdash:autoJoinMusic",
    "workdash_audio_settings",
    "wd:lastSeen",
    ...LOUNGE_PREF_STORAGE_KEYS,
] as const;

export function clearUserScopedStorage(): void {
    for (const key of USER_SCOPED_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key);
        } catch {
            // storage unavailable — nothing to clear
        }
    }
}

export function signOutWithCleanup(
    options?: Parameters<typeof signOut>[0],
): ReturnType<typeof signOut> {
    clearUserScopedStorage();
    return signOut(options);
}
