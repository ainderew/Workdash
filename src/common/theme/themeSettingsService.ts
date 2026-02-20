import {
    DEFAULT_THEME_ID,
    THEME_ATTRIBUTE,
    THEME_STORAGE_KEY,
    ThemeId,
} from "@/common/theme/_types";
import { parseThemeId } from "@/common/theme/themeValidation";

type ThemeSettingsResponse = {
    theme?: string | null;
};

export class ThemeSettingsService {
    private static instance: ThemeSettingsService;

    private constructor() {}

    static getInstance(): ThemeSettingsService {
        if (!ThemeSettingsService.instance) {
            ThemeSettingsService.instance = new ThemeSettingsService();
        }
        return ThemeSettingsService.instance;
    }

    applyThemeToDocument(theme: ThemeId): void {
        if (typeof document === "undefined") return;
        document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    }

    readThemeFromLocalStorage(): ThemeId | null {
        if (typeof window === "undefined") return null;

        try {
            const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            return parseThemeId(storedTheme);
        } catch {
            return null;
        }
    }

    writeThemeToLocalStorage(theme: ThemeId): void {
        if (typeof window === "undefined") return;

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            return;
        }
    }

    getDefaultTheme(): ThemeId {
        return DEFAULT_THEME_ID;
    }

    async fetchThemeFromApi(): Promise<ThemeId | null> {
        const response = await fetch("/api/user/settings", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const responseBody = await response.json().catch(() => ({}));
            throw new Error(
                responseBody?.error || `Server error: ${response.status}`,
            );
        }

        const body = (await response.json().catch(() => ({}))) as ThemeSettingsResponse;
        return parseThemeId(body.theme);
    }

    async persistThemeToApi(theme: ThemeId): Promise<void> {
        const response = await fetch("/api/user/settings", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ theme }),
        });

        if (!response.ok) {
            const responseBody = await response.json().catch(() => ({}));
            throw new Error(
                responseBody?.error || `Server error: ${response.status}`,
            );
        }
    }
}
