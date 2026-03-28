/**
 * Hook for desktop app download/launch logic.
 * Placeholder — will be expanded when the desktop app ships.
 */
export function useDesktopApp() {
    const isAvailable = false;
    const downloadUrl: string | null = null;

    return { isAvailable, downloadUrl } as const;
}
