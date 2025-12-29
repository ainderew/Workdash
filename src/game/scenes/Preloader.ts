import { Scene } from "phaser";
import { SpriteKeys } from "../commmon/enums";

export class Preloader extends Scene {
    private readonly PROGRESS_KEY = "progress-fill";

    private progressSprite!: Phaser.GameObjects.Sprite;
    private barWidth: number = 0;

    constructor() {
        super("Preloader");
    }

    preload() {
        const { width, height } = this.cameras.main;

        this.barWidth = width * 0.4;
        const barHeight = 20;
        const barX = width / 2 - this.barWidth / 2;
        const barY = height * 0.82;
        const borderRadius = barHeight / 10;

        this.createProgressTexture(this.barWidth, barHeight);

        const ui = this.add.graphics().setDepth(10);

        ui.fillStyle(0x050510, 0.5);
        ui.fillRoundedRect(barX, barY, this.barWidth, barHeight, borderRadius);
        ui.lineStyle(2, 0xc0c0c0, 10);
        ui.strokeRoundedRect(
            barX,
            barY,
            this.barWidth,
            barHeight,
            borderRadius,
        );

        this.progressSprite = this.add.sprite(
            barX + 2,
            barY + 2,
            this.PROGRESS_KEY,
        );
        this.progressSprite.setOrigin(0, 0).setDepth(11);
        this.progressSprite.setDisplaySize(this.barWidth - 4, barHeight - 4);
        this.progressSprite.setCrop(0, 0, 0, barHeight);

        this.add
            .text(width / 2, barY - 25, "LOADING ASSETS", {
                fontSize: "12px",
                fontFamily: "sans-serif",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setLetterSpacing(5);

        this.load.on("progress", (value: number) => {
            const currentFill = this.barWidth * value;
            this.progressSprite.setCrop(0, 0, currentFill, barHeight);
        });

        this.load.on("complete", () => {
            this.scene.start("Game");
        });

        this.loadGameAssets();
    }

    private createProgressTexture(width: number, height: number) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;

        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "#00ffff");
        gradient.addColorStop(0.6, "#00ffff");
        gradient.addColorStop(1, "#9d00ff");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        if (this.textures.exists(this.PROGRESS_KEY)) {
            this.textures.remove(this.PROGRESS_KEY);
        }
        this.textures.addCanvas(this.PROGRESS_KEY, canvas);
    }

    private loadGameAssets() {
        this.load.setPath("/assets");

        // const characterLoader = new CharacterAssetLoader(this);
        // characterLoader.loadAllCharacterAssets();

        this.load.image(
            "Exterior",
            "tile-sets/Modern_Exteriors_Complete_Tileset_32x32.png",
        );
        this.load.image("Interior_2", "tile-sets/Room_Builder_32x32.png");
        for (let i = 0; i < 9; i++) {
            this.load.image(
                `Interior_Tile_${i}`,
                `tile-sets/Interiors_32x32_part_${i}.png`,
            );
        }
        //Animated Tileset
        this.load.spritesheet(
            "Sliding_Door",
            "tile-sets/animated_door_glass_sliding_32x32.png",
            { frameWidth: 64, frameHeight: 64 },
        );
        this.load.spritesheet(
            "Animated_Coffee",
            "tile-sets/animated_coffee_32x32.png",
            { frameWidth: 32, frameHeight: 64 },
        );
        this.load.spritesheet(
            "Animated_Control_Panel",
            "tile-sets/animated_control_room_screens_32x32.png",
            { frameWidth: 128, frameHeight: 96 },
        );
        this.load.spritesheet(
            "Animated_Fish_Tank",
            "tile-sets/animated_fishtank_red_32x32.png",
            { frameWidth: 64, frameHeight: 64 },
        );

        this.load.spritesheet(
            "Animated_Server",
            "tile-sets/animated_control_room_server_32x32.png",
            { frameWidth: 32, frameHeight: 96 },
        );
        this.load.spritesheet(
            "Animated_Christmas_Lights",
            "tile-sets/animated_Christmas_tree_lights_32x32.png",
            { frameWidth: 64, frameHeight: 96 },
        );
        this.load.spritesheet(
            "Animated_Clock",
            "tile-sets/animated_cuckoo_clock_32x32.png",
            { frameWidth: 32, frameHeight: 64 },
        );

        this.load.tilemapTiledJSON("map", "map1.json");

        // Spritesheets
        const loadChar = (k: string, p: string, w: number, h: number) =>
            this.load.spritesheet(k, p, { frameWidth: w, frameHeight: h });
        loadChar(
            SpriteKeys.ADAM_ATTACK,
            "characters/Adam_phone_16x16.png",
            16,
            32,
        );
        loadChar(SpriteKeys.ADAM, "characters/Adam_idle_16x16.png", 16, 32);
        loadChar(
            SpriteKeys.ADAM_WALK,
            "characters/Adam_walk_16x16.png",
            16,
            32,
        );
    }
}
