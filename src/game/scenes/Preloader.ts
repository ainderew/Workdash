import { Scene } from "phaser";
import { SpriteKeys } from "../commmon/enums";

export class Preloader extends Scene {
    private readonly PROGRESS_KEY = "progress-fill";
    private readonly NEURAL_CANVAS_KEY = "neural-link-bg";

    private progressSprite!: Phaser.GameObjects.Sprite;
    private neuralTexture!: Phaser.Textures.CanvasTexture;
    private nodes: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
    }[] = [];
    private barWidth: number = 0;
    private readonly NODE_COUNT = 90;
    private readonly LINK_DISTANCE = 120;

    constructor() {
        super("Preloader");
    }

    preload() {
        const { width, height } = this.cameras.main;

        this.initNeuralCanvas(width, height);
        this.add.image(0, 0, this.NEURAL_CANVAS_KEY).setOrigin(0).setDepth(0);

        this.barWidth = width * 0.45;
        const barHeight = 20;
        const barX = width / 2 - this.barWidth / 2;
        const barY = height * 0.82;
        const borderRadius = barHeight / 2;

        this.createProgressTexture(this.barWidth, barHeight);

        const ui = this.add.graphics().setDepth(10);

        ui.fillStyle(0x050510, 0.9);
        ui.fillRoundedRect(barX, barY, this.barWidth, barHeight, borderRadius);
        ui.lineStyle(2, 0x00ffff, 1);
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
            const currentFill = (this.barWidth - 4) * value;
            this.progressSprite.setCrop(0, 0, currentFill, barHeight);
        });

        this.load.on("complete", () => {
            this.time.delayedCall(500, () => this.scene.start("Game"));
        });

        this.loadGameAssets();
    }

    private initNeuralCanvas(width: number, height: number) {
        this.neuralTexture = this.textures.createCanvas(
            this.NEURAL_CANVAS_KEY,
            width,
            height,
        )!;

        for (let i = 0; i < this.NODE_COUNT; i++) {
            this.nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                color: Math.random() > 0.5 ? "#00ffff" : "#9d00ff",
            });
        }
    }

    update() {
        if (!this.neuralTexture) return;

        const ctx = this.neuralTexture.context;
        const { width, height } = this.neuralTexture;

        ctx.fillStyle = "#050510";
        ctx.fillRect(0, 0, width, height);

        this.nodes.forEach((node) => {
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > width) node.vx *= -1;
            if (node.y < 0 || node.y > height) node.vy *= -1;
        });

        ctx.lineWidth = 0.8;
        for (let i = 0; i < this.nodes.length; i++) {
            const p1 = this.nodes[i];

            for (let j = i + 1; j < this.nodes.length; j++) {
                const p2 = this.nodes[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.LINK_DISTANCE) {
                    const opacity = 1 - distance / this.LINK_DISTANCE;
                    ctx.strokeStyle =
                        p1.color === "#00ffff"
                            ? `rgba(0, 255, 255, ${opacity * 0.4})`
                            : `rgba(157, 0, 255, ${opacity * 0.4})`;

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }

            ctx.fillStyle = p1.color;
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        this.neuralTexture.refresh();
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

        if (this.textures.exists(this.PROGRESS_KEY))
            this.textures.remove(this.PROGRESS_KEY);
        this.textures.addCanvas(this.PROGRESS_KEY, canvas);
    }

    private loadGameAssets() {
        this.load.setPath("assets");
        // Tilesets
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
        // Map & UI
        this.load.tilemapTiledJSON("map", "map1.json");
        this.load.image("star", "star.png");
        this.load.image("background", "theoria.jpg");
        this.load.image("active-voice", "sound.png");

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
