import { CONFIG } from "@/common/utils/config";

const STORAGE_KEY = "workdash_audio_settings";

export interface AudioSettings {
    backgroundMusicEnabled: boolean | null; // null means not set yet
    volume: number; // 0 to 1, default 0.3
}

/**
 * Service for managing audio settings persistence
 * Handles localStorage and API synchronization
 */
export class AudioSettingsService {
    private static instance: AudioSettingsService;

    private constructor() {}

    static getInstance(): AudioSettingsService {
        if (!AudioSettingsService.instance) {
            AudioSettingsService.instance = new AudioSettingsService();
        }
        return AudioSettingsService.instance;
    }

    /**
     * Get audio settings from localStorage
     */
    private getFromLocalStorage(): AudioSettings | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error(
                "Error reading audio settings from localStorage:",
                error,
            );
        }
        return null;
    }

    /**
     * Save audio settings to localStorage
     */
    private saveToLocalStorage(settings: AudioSettings): void {
        try {
            console.log("[AudioSettings] Saving to localStorage:", settings);
            console.trace("[AudioSettings] Save stack trace");
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error(
                "Error saving audio settings to localStorage:",
                error,
            );
        }
    }

    /**
     * Get JWT token from window
     */
    private getToken(): string | undefined {
        return window.__BACKEND_JWT__;
    }

    /**
     * Fetch audio settings from API
     */
    private async fetchFromAPI(): Promise<AudioSettings | null> {
        try {
            const token = this.getToken();
            if (!token) {
                console.warn("No JWT token available for fetching settings");
                return null;
            }

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/settings`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            console.log(
                "[AudioSettings] API response status:",
                response.status,
            );

            if (response.ok) {
                const data = await response.json();
                console.log("[AudioSettings] API returned data:", data);
                return {
                    backgroundMusicEnabled: data?.playBackgroundMusic ?? null,
                    volume: data?.volume ?? 0.3,
                };
            } else if (response.status === 404) {
                console.log("[AudioSettings] No settings found in API (404)");
                return null;
            }
        } catch (error) {
            console.error("Error fetching audio settings from API:", error);
        }
        return null;
    }

    /**
     * Save audio settings to API
     */
    private async saveToAPI(settings: AudioSettings): Promise<void> {
        try {
            const token = this.getToken();
            if (!token) {
                console.warn("No JWT token available for saving settings");
                return;
            }

            await fetch(`${CONFIG.SFU_SERVER_URL}/api/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    playBackgroundMusic: settings.backgroundMusicEnabled,
                    volume: settings.volume,
                }),
            });
        } catch (error) {
            console.error("Error saving audio settings to API:", error);
        }
    }

    /**
     * Get audio settings with fallback priority:
     * 1. localStorage
     * 2. API
     * 3. null (no preference set)
     */
    async getSettings(): Promise<AudioSettings> {
        // Check localStorage first
        const localSettings = this.getFromLocalStorage();
        if (
            localSettings?.backgroundMusicEnabled !== null &&
            localSettings?.backgroundMusicEnabled !== undefined
        ) {
            // Ensure volume property exists (for backward compatibility)
            return {
                backgroundMusicEnabled: localSettings.backgroundMusicEnabled,
                volume: localSettings.volume ?? 0.3,
            };
        }

        // Check API
        const apiSettings = await this.fetchFromAPI();
        if (
            apiSettings?.backgroundMusicEnabled !== null &&
            apiSettings?.backgroundMusicEnabled !== undefined
        ) {
            const completeSettings = {
                backgroundMusicEnabled: apiSettings.backgroundMusicEnabled,
                volume: apiSettings.volume ?? 0.3,
            };
            // Cache to localStorage only if user has made a choice
            this.saveToLocalStorage(completeSettings);
            return completeSettings;
        }

        // No preference set - don't save to localStorage yet
        // This ensures the first-time opt-in prompt will show
        return {
            backgroundMusicEnabled: null,
            volume: apiSettings?.volume ?? 0.3,
        };
    }

    /**
     * Update background music enabled setting
     */
    async setBackgroundMusicEnabled(enabled: boolean): Promise<void> {
        const currentSettings = await this.getSettings();
        const settings: AudioSettings = {
            backgroundMusicEnabled: enabled,
            volume: currentSettings.volume,
        };

        // Save to localStorage immediately
        this.saveToLocalStorage(settings);

        // Save to API in background (don't await)
        this.saveToAPI(settings).catch((error) => {
            console.error("Failed to sync settings to API:", error);
        });
    }

    /**
     * Update volume setting
     */
    async setVolume(volume: number): Promise<void> {
        const currentSettings = await this.getSettings();
        const settings: AudioSettings = {
            backgroundMusicEnabled: currentSettings.backgroundMusicEnabled,
            volume: Math.max(0, Math.min(1, volume)), // Clamp between 0 and 1
        };

        // Only save to localStorage if user has made a music choice
        // This prevents auto-creating localStorage before the opt-in prompt
        if (currentSettings.backgroundMusicEnabled !== null) {
            this.saveToLocalStorage(settings);

            // Save to API in background (don't await)
            this.saveToAPI(settings).catch((error) => {
                console.error("Failed to sync settings to API:", error);
            });
        }
        // If no choice made yet, volume will be updated when they make their choice
    }

    /**
     * Check if user has made a choice about background music
     */
    async hasUserMadeChoice(): Promise<boolean> {
        const settings = await this.getSettings();
        return settings.backgroundMusicEnabled !== null;
    }
}
