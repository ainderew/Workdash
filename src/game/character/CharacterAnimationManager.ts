import { Scene } from "phaser";
import {
    AttackAnimationKeys,
    WalkAnimationKeys,
    IdleAnimationKeys,
} from "../commmon/enums";

export class CharacterAnimationManager {
    private scene: Scene;
    private kartFrameConfig = {
        left: { startX: 385, startY: 4 * 64, frames: 6 },
        down: { startX: 576, startY: 5 * 64, frames: 3 },
        right: { startX: 768, startY: 4 * 64, frames: 6 },
        up: { startX: 385, startY: 5 * 64, frames: 3 },
    };

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Call this explicitly before destroying the texture
     */
    removeCharacterAnimations(characterKey: string): void {
        const animKeys = [
            `${characterKey}-idle`,
            `${characterKey}-idle-right`,
            `${characterKey}-idle-up`,
            `${characterKey}-idle-left`,
            `${characterKey}-idle-down`,
            `${characterKey}-walk-right`,
            `${characterKey}-walk-up`,
            `${characterKey}-walk-left`,
            `${characterKey}-walk-down`,
            `${characterKey}-attack`,
            `${characterKey}-soccer-kick`,
            `${characterKey}-kart-right`,
            `${characterKey}-kart-up`,
            `${characterKey}-kart-left`,
            `${characterKey}-kart-down`,
        ];

        for (const key of animKeys) {
            if (this.scene.anims.exists(key)) {
                this.scene.anims.remove(key);
            }
        }
    }

    private addCustomKartFrames(spritesheetKey: string): void {
        const texture = this.scene.textures.get(spritesheetKey);
        if (!texture || texture.key === "__MISSING") return;

        const KART_FRAME_WIDTH = 64;
        const KART_FRAME_HEIGHT = 64;
        const KART_FRAME_SPACING = 64;

        for (const [direction, config] of Object.entries(
            this.kartFrameConfig,
        )) {
            for (let i = 0; i < config.frames; i++) {
                const x = config.startX + i * KART_FRAME_SPACING;
                const y = config.startY;
                const frameName = `kart-${direction}-${i}`;

                texture.add(
                    frameName,
                    0,
                    x,
                    y,
                    KART_FRAME_WIDTH,
                    KART_FRAME_HEIGHT,
                );
            }
        }
    }

    createCharacterAnimations(
        characterKey: string,
        spritesheetKey: string,
    ): void {
        const texture = this.scene.textures.get(spritesheetKey);
        if (!texture || texture.key === "__MISSING") return;

        this.addCustomKartFrames(spritesheetKey);

        const FRAME_WIDTH = 32;
        const SHEET_WIDTH = 1824;
        const COLS = Math.floor(SHEET_WIDTH / FRAME_WIDTH);

        /**
         * MAPPER: Maps Visual Row to Logical Sheet Row
         */
        const getLogicalRow = (vRow: number): number => {
            switch (vRow) {
                case 1:
                    return 1;
                case 2:
                    return 2;
                case 5:
                    return 4;
                case 6:
                    return 9;
                default:
                    return vRow;
            }
        };

        // Define animations with explicit start/end columns
        // Based on the sheet: 6 frames per direction for walking and idle
        const animConfigs = [
            // --- IDLE (Row 1) - Directional ---
            {
                key: `${characterKey}-idle-right`,
                vRow: 1,
                startCol: 0,
                endCol: 5,
                rate: 5,
                repeat: -1,
            },
            {
                key: `${characterKey}-idle-up`,
                vRow: 1,
                startCol: 6,
                endCol: 11,
                rate: 5,
                repeat: -1,
            },
            {
                key: `${characterKey}-idle-left`,
                vRow: 1,
                startCol: 12,
                endCol: 17,
                rate: 5,
                repeat: -1,
            },
            {
                key: `${characterKey}-idle-down`,
                vRow: 1,
                startCol: 18,
                endCol: 23,
                rate: 5,
                repeat: -1,
            },
            // Keep the default idle for backwards compatibility (faces down/front)
            {
                key: `${characterKey}-idle`,
                vRow: 1,
                startCol: 18,
                endCol: 23,
                rate: 5,
                repeat: -1,
            },
            // --- WALKING (Row 2) ---
            {
                key: `${characterKey}-walk-right`,
                vRow: 2,
                startCol: 0,
                endCol: 5,
                rate: 10,
                repeat: -1,
            },
            {
                key: `${characterKey}-walk-up`,
                vRow: 2,
                startCol: 6,
                endCol: 11,
                rate: 10,
                repeat: -1,
            },
            {
                key: `${characterKey}-walk-left`,
                vRow: 2,
                startCol: 12,
                endCol: 17,
                rate: 10,
                repeat: -1,
            },
            {
                key: `${characterKey}-walk-down`,
                vRow: 2,
                startCol: 18,
                endCol: 23,
                rate: 10,
                repeat: -1,
            },
            // --- ATTACK ---
            {
                key: `${characterKey}-attack`,
                vRow: 6,
                startCol: 13,
                endCol: 24,
                rate: 10,
                repeat: 0,
            },
            // --- SOCCER KICK (Row 10, 3 frames starting at col 0) ---
            {
                key: `${characterKey}-soccer-kick`,
                vRow: 10,
                startCol: 0,
                endCol: 2,
                rate: 3,
                repeat: 0,
            },
            {
                key: `${characterKey}-kart-left`,
                rate: 6,
                repeat: -1,
            },
            {
                key: `${characterKey}-kart-down`,
                rate: 6,
                repeat: -1,
            },
            {
                key: `${characterKey}-kart-right`,
                rate: 6,
                repeat: -1,
            },
            {
                key: `${characterKey}-kart-up`,
                rate: 6,
                repeat: -1,
            },
        ];

        for (const config of animConfigs) {
            if (this.scene.anims.exists(config.key)) {
                try {
                    this.scene.anims.remove(config.key);
                } catch (e) {
                    console.warn(
                        `Force clearing animation ${config.key} failed gracefully`,
                        e,
                    );
                    this.scene.anims.remove(config.key);
                }
            }

            const isKartAnim = config.key.includes("-kart-");

            if (isKartAnim) {
                const direction = config.key.split(
                    "-kart-",
                )[1] as keyof typeof this.kartFrameConfig;
                const frameCount = this.kartFrameConfig[direction]?.frames || 6;
                const frameNames = [];
                for (let i = 0; i < frameCount; i++) {
                    frameNames.push({
                        key: spritesheetKey,
                        frame: `kart-${direction}-${i}`,
                    });
                }

                this.scene.anims.create({
                    key: config.key,
                    frames: frameNames,
                    frameRate: config.rate,
                    repeat: config.repeat,
                });
            } else {
                const lRow = getLogicalRow(config.vRow!);
                const rowStartIdx = lRow * COLS;

                const startFrame = rowStartIdx + config.startCol!;
                const endFrame = rowStartIdx + config.endCol!;

                this.scene.anims.create({
                    key: config.key,
                    frames: this.scene.anims.generateFrameNumbers(
                        spritesheetKey,
                        {
                            start: startFrame,
                            end: endFrame,
                        },
                    ),
                    frameRate: config.rate,
                    repeat: config.repeat,
                });
            }
        }
    }

    updateAnimationKeys(characterKey: string): void {
        AttackAnimationKeys[characterKey] = `${characterKey}-attack`;

        // Default idle (backwards compatibility)
        IdleAnimationKeys[characterKey] = `${characterKey}-idle`;

        // Directional idle animations
        IdleAnimationKeys[`${characterKey}_DOWN`] = `${characterKey}-idle-down`;
        IdleAnimationKeys[`${characterKey}_UP`] = `${characterKey}-idle-up`;
        IdleAnimationKeys[`${characterKey}_LEFT`] = `${characterKey}-idle-left`;
        IdleAnimationKeys[`${characterKey}_RIGHT`] =
            `${characterKey}-idle-right`;

        // Walk animations
        WalkAnimationKeys[characterKey] = `${characterKey}-walk-down`;
        WalkAnimationKeys[`${characterKey}_DOWN`] = `${characterKey}-walk-down`;
        WalkAnimationKeys[`${characterKey}_UP`] = `${characterKey}-walk-up`;
        WalkAnimationKeys[`${characterKey}_LEFT`] = `${characterKey}-walk-left`;
        WalkAnimationKeys[`${characterKey}_RIGHT`] =
            `${characterKey}-walk-right`;
    }

    getKartAnimationKey(
        characterKey: string,
        direction: "UP" | "DOWN" | "LEFT" | "RIGHT",
    ): string {
        return `${characterKey}-kart-${direction.toLowerCase()}`;
    }
}