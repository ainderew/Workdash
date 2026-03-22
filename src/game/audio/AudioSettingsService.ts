import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";

const STORAGE_KEY = "workdash_audio_settings";

export interface AudioSettings {
    backgroundMusicEnabled: boolean | null;
    volume: number;
    selectedMicrophoneId: string | null;
    selectedCameraId: string | null;
    selectedOutputDeviceId: string | null;
}

export class AudioSettingsService {
    private static instance: AudioSettingsService;

    private cachedSettings: AudioSettings | null = null;

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
        return tokenStore.getJwt() || undefined;
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
                    selectedMicrophoneId: data?.selectedMicrophoneId ?? null,
                    selectedCameraId: data?.selectedCameraId ?? null,
                    selectedOutputDeviceId: data?.selectedOutputDeviceId ?? null,
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

            const payload: Record<string, unknown> = {
                volume: settings.volume,
                selectedMicrophoneId: settings.selectedMicrophoneId,
                selectedCameraId: settings.selectedCameraId,
                selectedOutputDeviceId: settings.selectedOutputDeviceId,
            };

            // Only include playBackgroundMusic when it's a boolean — null means
            // the user hasn't made a choice yet, and the backend rejects non-boolean.
            if (settings.backgroundMusicEnabled !== null) {
                payload.playBackgroundMusic = settings.backgroundMusicEnabled;
            }

            await fetch(`${CONFIG.SFU_SERVER_URL}/api/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
        } catch {
            return;
        }
    }

    async getSettings(): Promise<AudioSettings> {
        if (this.cachedSettings) {
            return { ...this.cachedSettings };
        }

        const localSettings = this.getFromLocalStorage();

        // Existing users may have localStorage from before the device feature —
        // if device fields are missing, fall through to API fetch.
        const hasDeviceFields = localSettings &&
            'selectedMicrophoneId' in localSettings;

        if (
            hasDeviceFields &&
            localSettings?.backgroundMusicEnabled !== null &&
            localSettings?.backgroundMusicEnabled !== undefined
        ) {
            const settings: AudioSettings = {
                backgroundMusicEnabled: localSettings.backgroundMusicEnabled,
                volume: localSettings.volume ?? 0.3,
                selectedMicrophoneId: localSettings.selectedMicrophoneId ?? null,
                selectedCameraId: localSettings.selectedCameraId ?? null,
                selectedOutputDeviceId: localSettings.selectedOutputDeviceId ?? null,
            };
            this.cachedSettings = settings;
            return { ...settings };
        }

        const apiSettings = await this.fetchFromAPI();
        if (
            apiSettings?.backgroundMusicEnabled !== null &&
            apiSettings?.backgroundMusicEnabled !== undefined
        ) {
            const completeSettings: AudioSettings = {
                backgroundMusicEnabled: apiSettings.backgroundMusicEnabled,
                volume: apiSettings.volume ?? 0.3,
                selectedMicrophoneId: apiSettings.selectedMicrophoneId ?? null,
                selectedCameraId: apiSettings.selectedCameraId ?? null,
                selectedOutputDeviceId: apiSettings.selectedOutputDeviceId ?? null,
            };
            this.saveToLocalStorage(completeSettings);
            this.cachedSettings = completeSettings;
            return { ...completeSettings };
        }

        const defaults: AudioSettings = {
            backgroundMusicEnabled: null,
            volume: apiSettings?.volume ?? 0.3,
            selectedMicrophoneId: apiSettings?.selectedMicrophoneId ?? null,
            selectedCameraId: apiSettings?.selectedCameraId ?? null,
            selectedOutputDeviceId: apiSettings?.selectedOutputDeviceId ?? null,
        };
        this.cachedSettings = defaults;
        return { ...defaults };
    }

    private async updateSettings(patch: Partial<AudioSettings>): Promise<void> {
        const currentSettings = await this.getSettings();
        const settings: AudioSettings = {
            ...currentSettings,
            ...patch,
        };

        this.cachedSettings = settings;
        this.saveToLocalStorage(settings);
        this.saveToAPI(settings).catch(() => {});
    }

    async setBackgroundMusicEnabled(enabled: boolean): Promise<void> {
        await this.updateSettings({ backgroundMusicEnabled: enabled });
    }

    async setVolume(volume: number): Promise<void> {
        const currentSettings = await this.getSettings();
        if (currentSettings.backgroundMusicEnabled !== null) {
            await this.updateSettings({ volume: Math.max(0, Math.min(1, volume)) });
        }
    }

    async setSelectedMicrophoneId(deviceId: string | null): Promise<void> {
        await this.updateSettings({ selectedMicrophoneId: deviceId });
    }

    async setSelectedCameraId(deviceId: string | null): Promise<void> {
        await this.updateSettings({ selectedCameraId: deviceId });
    }

    async setSelectedOutputDeviceId(deviceId: string | null): Promise<void> {
        await this.updateSettings({ selectedOutputDeviceId: deviceId });
    }

    async hasUserMadeChoice(): Promise<boolean> {
        const settings = await this.getSettings();
        return settings.backgroundMusicEnabled !== null;
    }
}
