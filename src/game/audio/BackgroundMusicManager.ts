import { Scene } from "phaser";
import { AudioSettingsService } from "./AudioSettingsService";
import { EventBus } from "../EventBus";

/**
 * Manager for background music playback
 * Handles starting, stopping, and volume control
 */
export class BackgroundMusicManager {
    private scene: Scene;
    private music: Phaser.Sound.BaseSound | null = null;
    private settingsService: AudioSettingsService;
    private isEnabled: boolean = false;
    private currentVolume: number = 0.3;

    constructor(scene: Scene) {
        this.scene = scene;
        this.settingsService = AudioSettingsService.getInstance();
        this.setupEventListeners();
        this.setupDebugListeners();
    }

    /**
     * Setup debug listeners for blur/focus events
     */
    private setupDebugListeners(): void {
        window.addEventListener("blur", () => {
            console.log("[BackgroundMusicManager] Window blur - Music playing?", this.music?.isPlaying);
            console.log("[BackgroundMusicManager] Music paused?", (this.music as any)?.isPaused);
        });

        window.addEventListener("focus", () => {
            console.log("[BackgroundMusicManager] Window focus - Music playing?", this.music?.isPlaying);
            console.log("[BackgroundMusicManager] Music paused?", (this.music as any)?.isPaused);

            // Force resume if paused
            if (this.music && !(this.music as any).isPlaying && this.isEnabled) {
                console.log("[BackgroundMusicManager] Music was stopped, restarting...");
                this.music.play();
            }
        });
    }

    /**
     * Setup event listeners for settings changes
     */
    private setupEventListeners(): void {
        EventBus.on("background-music-toggle", this.handleToggle.bind(this));
        EventBus.on("background-music-volume", this.handleVolumeChange.bind(this));
    }

    /**
     * Initialize background music system
     * Checks settings and prompts user if needed
     */
    async initialize(): Promise<void> {
        console.log("[BackgroundMusicManager] Initializing...");
        const settings = await this.settingsService.getSettings();
        console.log("[BackgroundMusicManager] Got settings:", settings);
        this.currentVolume = settings.volume;

        const hasChoice = await this.settingsService.hasUserMadeChoice();
        console.log("[BackgroundMusicManager] Has user made choice:", hasChoice);

        if (hasChoice) {
            // User has already made a choice
            if (settings.backgroundMusicEnabled) {
                console.log("[BackgroundMusicManager] Starting music (user chose to enable)");
                this.start();
            } else {
                console.log("[BackgroundMusicManager] Not starting music (user chose to disable)");
            }
        } else {
            // No choice made - start music and prompt user
            console.log("[BackgroundMusicManager] No choice made, starting music and showing prompt");
            this.start();
            EventBus.emit("prompt-background-music-opt-in");
        }
    }

    /**
     * Start background music
     */
    start(): void {
        if (!this.music) {
            this.music = this.scene.sound.add("bg_music_1", {
                loop: true,
                volume: this.currentVolume,
            });
            console.log("[BackgroundMusicManager] Created music sound object");
        }

        if (!this.music.isPlaying) {
            console.log("[BackgroundMusicManager] Starting music playback");
            this.music.play();
            this.isEnabled = true;
        }
    }

    /**
     * Stop background music
     */
    stop(): void {
        if (this.music && this.music.isPlaying) {
            this.music.stop();
            this.isEnabled = false;
        }
    }

    /**
     * Handle toggle from settings UI
     */
    private async handleToggle(enabled: boolean): Promise<void> {
        // Save preference
        await this.settingsService.setBackgroundMusicEnabled(enabled);

        // Update playback
        if (enabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    /**
     * Handle volume change from settings UI
     */
    private async handleVolumeChange(volume: number): Promise<void> {
        this.currentVolume = Math.max(0, Math.min(1, volume));

        // Update current music volume
        if (this.music) {
            this.music.setVolume(this.currentVolume);
        }

        // Save preference
        await this.settingsService.setVolume(this.currentVolume);
    }

    /**
     * Set music volume (0 to 1)
     */
    setVolume(volume: number): void {
        this.handleVolumeChange(volume);
    }

    /**
     * Get current enabled state
     */
    getIsEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Cleanup
     */
    destroy(): void {
        EventBus.off("background-music-toggle", this.handleToggle.bind(this));
        EventBus.off("background-music-volume", this.handleVolumeChange.bind(this));
        if (this.music) {
            this.music.destroy();
            this.music = null;
        }
    }
}
