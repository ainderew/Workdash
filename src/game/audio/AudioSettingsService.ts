import { CONFIG } from "@/common/utils/config";

const STORAGE_KEY = "workdash_audio_settings";

export interface AudioSettings {
    backgroundMusicEnabled: boolean | null;
    volume: number;
}

export class AudioSettingsService {
    private static instance: AudioSettingsService;

    private constructor() {}

    static getInstance(): AudioSettingsService {
        if (!AudioSettingsService.instance) {
            AudioSettingsService.instance = new AudioSettingsService();
        }
        return AudioSettingsService.instance;
    }

    private getFromLocalStorage(): AudioSettings | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch {
            return null;
        }
        return null;
    }

    private saveToLocalStorage(settings: AudioSettings): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            return;
        }
    }

    private getToken(): string | undefined {
        return window.__BACKEND_JWT__;
    }

    private async fetchFromAPI(): Promise<AudioSettings | null> {
        try {
            const token = this.getToken();
            if (!token) {
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

            if (response.ok) {
                const data = await response.json();
                return {
                    backgroundMusicEnabled: data?.playBackgroundMusic ?? null,
                    volume: data?.volume ?? 0.3,
                };
            } else if (response.status === 404) {
                return null;
            }
        } catch {
            return null;
        }
        return null;
    }

    private async saveToAPI(settings: AudioSettings): Promise<void> {
        try {
            const token = this.getToken();
            if (!token) {
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
        } catch {
            return;
        }
    }

    async getSettings(): Promise<AudioSettings> {
        const localSettings = this.getFromLocalStorage();
        if (
            localSettings?.backgroundMusicEnabled !== null &&
            localSettings?.backgroundMusicEnabled !== undefined
        ) {
            return {
                backgroundMusicEnabled: localSettings.backgroundMusicEnabled,
                volume: localSettings.volume ?? 0.3,
            };
        }

        const apiSettings = await this.fetchFromAPI();
        if (
            apiSettings?.backgroundMusicEnabled !== null &&
            apiSettings?.backgroundMusicEnabled !== undefined
        ) {
            const completeSettings = {
                backgroundMusicEnabled: apiSettings.backgroundMusicEnabled,
                volume: apiSettings.volume ?? 0.3,
            };
            this.saveToLocalStorage(completeSettings);
            return completeSettings;
        }

        return {
            backgroundMusicEnabled: null,
            volume: apiSettings?.volume ?? 0.3,
        };
    }

    async setBackgroundMusicEnabled(enabled: boolean): Promise<void> {
        const currentSettings = await this.getSettings();
        const settings: AudioSettings = {
            backgroundMusicEnabled: enabled,
            volume: currentSettings.volume,
        };

        this.saveToLocalStorage(settings);
        this.saveToAPI(settings).catch(() => {});
    }

    async setVolume(volume: number): Promise<void> {
        const currentSettings = await this.getSettings();
        const settings: AudioSettings = {
            backgroundMusicEnabled: currentSettings.backgroundMusicEnabled,
            volume: Math.max(0, Math.min(1, volume)),
        };

        if (currentSettings.backgroundMusicEnabled !== null) {
            this.saveToLocalStorage(settings);
            this.saveToAPI(settings).catch(() => {});
        }
    }

    async hasUserMadeChoice(): Promise<boolean> {
        const settings = await this.getSettings();
        return settings.backgroundMusicEnabled !== null;
    }
}
