import { DEFAULT_THEME_ID, THEME_IDS, ThemeId } from "@/common/theme/_types";

const THEME_ID_SET = new Set<ThemeId>(THEME_IDS);

const normalizeThemeInput = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
};

export const isThemeId = (value: unknown): value is ThemeId => {
    const normalized = normalizeThemeInput(value);
    if (!normalized) return false;
    return THEME_ID_SET.has(normalized as ThemeId);
};

export const parseThemeId = (value: unknown): ThemeId | null => {
    const normalized = normalizeThemeInput(value);
    if (!normalized) return null;
    if (!THEME_ID_SET.has(normalized as ThemeId)) return null;
    return normalized as ThemeId;
};

export const parseThemeIdOrDefault = (
    value: unknown,
    fallback: ThemeId = DEFAULT_THEME_ID,
): ThemeId => {
    return parseThemeId(value) ?? fallback;
};

export const assertThemeId = (
    value: unknown,
    fieldName = "theme",
): ThemeId => {
    const parsed = parseThemeId(value);
    if (!parsed) {
        throw new Error(`Invalid ${fieldName}`);
    }
    return parsed;
};
