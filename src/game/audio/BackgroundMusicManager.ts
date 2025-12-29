import { Scene } from "phaser";
import { AudioSettingsService } from "./AudioSettingsService";
import { EventBus } from "../EventBus";

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

    private setupDebugListeners(): void {
        window.addEventListener("blur", () => {
            if (this.music && !this.music.isPlaying && this.isEnabled) {
                this.music.play();
            }
        });

        window.addEventListener("focus", () => {
            if (this.music && !this.music.isPlaying && this.isEnabled) {
                this.music.play();
            }
        });
    }

    private setupEventListeners(): void {
        EventBus.on("background-music-toggle", this.handleToggle.bind(this));
        EventBus.on(
            "background-music-volume",
            this.handleVolumeChange.bind(this),
        );
    }

    async initialize(): Promise<void> {
        const settings = await this.settingsService.getSettings();
        this.currentVolume = settings.volume;

        const hasChoice = await this.settingsService.hasUserMadeChoice();

        if (hasChoice) {
            if (settings.backgroundMusicEnabled) {
                this.start();
            }
        } else {
            this.start();
            EventBus.emit("prompt-background-music-opt-in");
        }
    }

    start(): void {
        if (!this.music) {
            this.music = this.scene.sound.add("bg_music_1", {
                loop: true,
                volume: this.currentVolume,
            });
        }

        if (!this.music.isPlaying) {
            this.music.play();
            this.isEnabled = true;
        }
    }

    stop(): void {
        if (this.music && this.music.isPlaying) {
            this.music.stop();
            this.isEnabled = false;
        }
    }

    private async handleToggle(enabled: boolean): Promise<void> {
        await this.settingsService.setBackgroundMusicEnabled(enabled);

        if (enabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    private async handleVolumeChange(volume: number): Promise<void> {
        this.currentVolume = Math.max(0, Math.min(1, volume));

        if (this.music && 'setVolume' in this.music) {
            (this.music as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(this.currentVolume);
        }

        await this.settingsService.setVolume(this.currentVolume);
    }

    setVolume(volume: number): void {
        this.handleVolumeChange(volume);
    }

    getIsEnabled(): boolean {
        return this.isEnabled;
    }

    destroy(): void {
        EventBus.off("background-music-toggle", this.handleToggle.bind(this));
        EventBus.off(
            "background-music-volume",
            this.handleVolumeChange.bind(this),
        );
        if (this.music) {
            this.music.destroy();
            this.music = null;
        }
    }
}
