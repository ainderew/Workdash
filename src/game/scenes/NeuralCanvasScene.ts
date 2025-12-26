import { Scene } from "phaser";

export class NeuralCanvasScene extends Scene {
    private readonly NEURAL_CANVAS_KEY = "neural-link-bg";
    private nodes: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
    }[] = [];
    private width: number;
    private height: number;

    private lastRender = 0;
    private renderInterval = 1000 / 60; // default 30 FPS

    private neuralTexture!: Phaser.Textures.CanvasTexture;

    private readonly NODE_COUNT = 200;
    private readonly LINK_DISTANCE = 200;

    constructor() {
        super("NeuralCanvas");
    }

    create() {
        const { width, height } = this.cameras.main;

        this.initNeuralCanvas(width, height);

        this.add.image(0, 0, this.NEURAL_CANVAS_KEY).setOrigin(0).setDepth(0);
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

    update(time: number) {
        for (const node of this.nodes) {
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > this.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.height) node.vy *= -1;
        }

        // Skip expensive draw if interval not met
        if (time - this.lastRender < this.renderInterval) return;
        this.lastRender = time;

        const ctx = this.neuralTexture.context;
        const { width, height } = this.neuralTexture;

        ctx.fillStyle = "#050510";
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 0.8;

        for (let i = 0; i < this.nodes.length; i++) {
            const p1 = this.nodes[i];

            for (let j = i + 1; j < this.nodes.length; j++) {
                const p2 = this.nodes[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.LINK_DISTANCE) {
                    const o = 1 - dist / this.LINK_DISTANCE;
                    ctx.strokeStyle =
                        p1.color === "#00ffff"
                            ? `rgba(0,255,255,${o * 0.4})`
                            : `rgba(157,0,255,${o * 0.4})`;

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
}
