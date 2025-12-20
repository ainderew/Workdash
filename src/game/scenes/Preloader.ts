import { Scene } from "phaser";
import { SpriteKeys } from "../commmon/enums";

export class Preloader extends Scene {
    private readonly GRADIENT_KEY = "progress-gradient";
    private progressSprite!: Phaser.GameObjects.Sprite;
    private barWidth: number = 0;

    constructor() {
        super("Preloader");
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.load.image("loading-bg", "assets/loading-screen.jpg");

        // Background Image Layer
        this.load.once("filecomplete-image-loading-bg", () => {
            const bg = this.add.image(width / 2, height / 2, "loading-bg");
            bg.setOrigin(0.5).setDepth(-10);
            const scale = Math.max(width / bg.width, height / bg.height);
            bg.setScale(0.6);
        });

        this.barWidth = width * 0.45;
        const barHeight = 20;
        const barX = width / 2 - this.barWidth / 2;
        const barY = height * 0.82;
        const borderRadius = barHeight / 2;

        this.createGradientTexture(this.barWidth, barHeight);

        // 4. Solid HD Border & Track (Background of the bar)
        const progressUI = this.add.graphics();
        progressUI.setDepth(1);

        // Solid Track Background
        progressUI.fillStyle(0x000000, 0.8);
        progressUI.fillRoundedRect(
            barX,
            barY,
            this.barWidth,
            barHeight,
            borderRadius,
        );

        // Solid HD Border (Crisp Cyan)
        progressUI.lineStyle(2, 0x00ffff, 1);
        progressUI.strokeRoundedRect(
            barX,
            barY,
            this.barWidth,
            barHeight,
            borderRadius,
        );

        // 5. The Actual Gradient Sprite (The Fill)
        // We use setCrop to simulate the loading fill
        this.progressSprite = this.add.sprite(
            barX + 2,
            barY + 2,
            this.GRADIENT_KEY,
        );
        this.progressSprite.setOrigin(0, 0).setDepth(2);

        // Adjust the sprite slightly to fit inside the 2px border
        this.progressSprite.setDisplaySize(this.barWidth - 4, barHeight - 4);

        // Initialize with 0 width visible
        this.progressSprite.setCrop(0, 0, 0, barHeight);

        // 6. Minimalist Text
        this.add
            .text(width / 2, barY - 25, "SYNCHRONIZING ASSETS", {
                fontSize: 20,
                fontFamily: "'Inter', sans-serif",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setLetterSpacing(4);

        // --- LOAD EVENTS ---

        this.load.on("progress", (value: number) => {
            // value is 0 to 1. We crop the texture based on this value.
            // setCrop(x, y, width, height)
            const totalWidth = this.barWidth - 4;
            this.progressSprite.setCrop(0, 0, totalWidth * value, barHeight);
        });

        this.load.on("complete", () => {
            this.time.delayedCall(300, () => this.scene.start("Game"));
        });

        this.loadGameAssets();
    }

    private createGradientTexture(width: number, height: number): void {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;

        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "#00ffff");
        gradient.addColorStop(0.4, "#00ffff");
        gradient.addColorStop(1, "#9d00ff");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        if (this.textures.exists(this.GRADIENT_KEY)) {
            this.textures.remove(this.GRADIENT_KEY);
        }
        this.textures.addCanvas(this.GRADIENT_KEY, canvas);
    }

    private loadGameAssets() {
        this.load.setPath("assets");
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
        this.load.tilemapTiledJSON("map", "map1.json");
        this.load.image("star", "star.png");
        this.load.image("background", "theoria.jpg");
        this.load.image("active-voice", "sound.png");

        const loadChar = (key: string, path: string, w: number, h: number) =>
            this.load.spritesheet(key, path, { frameWidth: w, frameHeight: h });

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
        loadChar(
            SpriteKeys.ORC,
            "characters/Characters/Orc/OrcWithShadow/Orc.png",
            100,
            100,
        );
        loadChar(
            SpriteKeys.ORC_ATTACK,
            "characters/Characters/Orc/OrcWithShadow/Orc-Attack01.png",
            100,
            100,
        );
        loadChar(
            SpriteKeys.ORC_WALK,
            "characters/Characters/Orc/OrcWithShadow/Orc-Walk.png",
            100,
            100,
        );
        loadChar(
            SpriteKeys.SOLDIER,
            "characters/Characters/Soldier/SoldierWithShadow/Soldier.png",
            100,
            100,
        );
        loadChar(
            SpriteKeys.SOLDIER_ATTACK,
            "characters/Characters/Soldier/SoldierWithShadow/Soldier-Attack01.png",
            100,
            100,
        );
        loadChar(
            SpriteKeys.SOLDIER_WALK,
            "characters/Characters/Soldier/Soldier/Soldier-Walk.png",
            100,
            100,
        );
    }
}
