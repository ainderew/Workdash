import { ThemeId } from "@/common/theme/_types";

export interface ThemeStoreState {
    theme: ThemeId;
    initialized: boolean;
    isSyncing: boolean;
    lastSyncError: string | null;
    setThemeLocal: (theme: ThemeId) => void;
    bootstrapTheme: () => Promise<void>;
    persistTheme: (theme: ThemeId) => Promise<void>;
    clearSyncError: () => void;
}
