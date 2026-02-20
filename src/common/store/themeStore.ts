import { create } from "zustand";
import { DEFAULT_THEME_ID, ThemeId } from "@/common/theme/_types";
import { ThemeSettingsService } from "@/common/theme/themeSettingsService";
import { ThemeStoreState } from "@/common/store/themeStore_types";

const themeSettingsService = ThemeSettingsService.getInstance();

const applyLocalTheme = (theme: ThemeId) => {
    themeSettingsService.applyThemeToDocument(theme);
    themeSettingsService.writeThemeToLocalStorage(theme);
};

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return "Unknown theme sync error";
};

const useThemeStore = create<ThemeStoreState>((set, get) => ({
    theme: DEFAULT_THEME_ID,
    initialized: false,
    isSyncing: false,
    lastSyncError: null,
    setThemeLocal: (theme: ThemeId) => {
        applyLocalTheme(theme);
        set({
            theme,
            lastSyncError: null,
        });
    },
    bootstrapTheme: async () => {
        const { initialized } = get();
        if (initialized) return;

        const localTheme =
            themeSettingsService.readThemeFromLocalStorage() ?? DEFAULT_THEME_ID;

        applyLocalTheme(localTheme);
        set({
            theme: localTheme,
        });

        try {
            const backendTheme = await themeSettingsService.fetchThemeFromApi();
            const canonicalTheme = backendTheme ?? DEFAULT_THEME_ID;
            applyLocalTheme(canonicalTheme);
            set({
                theme: canonicalTheme,
                initialized: true,
                lastSyncError: null,
            });
        } catch (error) {
            set({
                initialized: true,
                lastSyncError: getErrorMessage(error),
            });
        }
    },
    persistTheme: async (theme: ThemeId) => {
        set({
            isSyncing: true,
            lastSyncError: null,
        });

        try {
            await themeSettingsService.persistThemeToApi(theme);
            set({
                isSyncing: false,
                lastSyncError: null,
            });
        } catch (error) {
            set({
                isSyncing: false,
                lastSyncError: getErrorMessage(error),
            });
        }
    },
    clearSyncError: () => {
        set({
            lastSyncError: null,
        });
    },
}));

export default useThemeStore;
