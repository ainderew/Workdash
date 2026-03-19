export const THEME_IDS = [
    "classic",
    "cyber",
    "eco",
    "a11y",
    "discord",
    "discord-classic",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeSwatch = {
    base: string;
    surface: string;
    accent: string;
};

export type ThemeDefinition = {
    id: ThemeId;
    label: string;
    description: string;
    swatch: ThemeSwatch;
};

export const DEFAULT_THEME_ID: ThemeId = "classic";
export const THEME_STORAGE_KEY = "workdash:theme";
export const THEME_ATTRIBUTE = "data-theme";
