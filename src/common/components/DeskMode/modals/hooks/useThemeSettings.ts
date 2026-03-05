import { useCallback } from 'react';
import useThemeStore from '@/common/store/themeStore';
import type { ThemeId } from '@/common/theme/_types';

export function useThemeSettings() {
  const theme = useThemeStore((state) => state.theme);
  const setThemeLocal = useThemeStore((state) => state.setThemeLocal);
  const persistTheme = useThemeStore((state) => state.persistTheme);
  const isSyncing = useThemeStore((state) => state.isSyncing);
  const syncError = useThemeStore((state) => state.lastSyncError);
  const clearSyncError = useThemeStore((state) => state.clearSyncError);

  const handleThemeSelect = useCallback(
    (nextTheme: ThemeId) => {
      setThemeLocal(nextTheme);
      void persistTheme(nextTheme);
    },
    [setThemeLocal, persistTheme],
  );

  return {
    theme,
    isSyncing,
    syncError,
    handleThemeSelect,
    clearSyncError,
  };
}
