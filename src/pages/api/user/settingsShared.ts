import { CONFIG } from "@/common/utils/config";
import { ThemeId } from "@/common/theme/_types";
import { parseThemeId } from "@/common/theme/themeValidation";

export type UserThemeSettingsPatchInput = {
    theme: ThemeId | null;
};

export type UserThemeSettingsApiPayload = {
    theme: ThemeId | null;
};

export type ThemePatchValidationResult =
    | { ok: true; input: UserThemeSettingsPatchInput }
    | { ok: false; status: number; error: string };

const normalizeThemeInput = (
    value: unknown,
): ThemeId | null | "invalid" => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return "invalid";

    const normalized = value.trim();
    if (!normalized) return null;

    const parsed = parseThemeId(normalized);
    return parsed ?? "invalid";
};

export const validateThemeSettingsPatchInput = (
    rawInput: unknown,
): ThemePatchValidationResult => {
    if (!rawInput || typeof rawInput !== "object") {
        return {
            ok: false,
            status: 400,
            error: "Invalid request body",
        };
    }

    const body = rawInput as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(body, "theme")) {
        return {
            ok: false,
            status: 400,
            error: "theme is required",
        };
    }

    const normalizedTheme = normalizeThemeInput(body.theme);
    if (normalizedTheme === "invalid") {
        return {
            ok: false,
            status: 400,
            error: "Invalid theme",
        };
    }

    return {
        ok: true,
        input: {
            theme: normalizedTheme,
        },
    };
};

const parseBackendResponseBody = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { error: text };
    }
};

const toUserThemePayload = (rawBody: unknown): UserThemeSettingsApiPayload => {
    if (!rawBody || typeof rawBody !== "object") {
        return { theme: null };
    }

    const body = rawBody as Record<string, unknown>;
    const parsedTheme = parseThemeId(body.theme);
    return { theme: parsedTheme ?? null };
};

export const getBackendUserSettings = async (
    token: string,
): Promise<{ status: number; body: UserThemeSettingsApiPayload }> => {
    const settingsResponse = await fetch(`${CONFIG.SFU_SERVER_URL}/api/settings`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const responseBody = await parseBackendResponseBody(settingsResponse);
    return {
        status: settingsResponse.status,
        body: toUserThemePayload(responseBody),
    };
};

export const patchBackendUserSettings = async (
    token: string,
    input: UserThemeSettingsPatchInput,
): Promise<{ status: number; body: UserThemeSettingsApiPayload | { error: string } }> => {
    const settingsResponse = await fetch(`${CONFIG.SFU_SERVER_URL}/api/settings`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
    });

    const responseBody = await parseBackendResponseBody(settingsResponse);
    if (!settingsResponse.ok) {
        return {
            status: settingsResponse.status,
            body: {
                error:
                    typeof (responseBody as Record<string, unknown>)?.error ===
                    "string"
                        ? ((responseBody as Record<string, unknown>).error as string)
                        : "Failed to update settings",
            },
        };
    }

    return {
        status: settingsResponse.status,
        body: toUserThemePayload(responseBody),
    };
};
