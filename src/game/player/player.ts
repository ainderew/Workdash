import Phaser, { Scene } from "phaser";
import {
    AttackAnimationKeys,
    IdleAnimationKeys,
    WalkAnimationKeys,
} from "../commmon/enums";
import { ReactionData } from "@/communication/reaction/_types";
import { AvailabilityStatus } from "./_enums";
import { CharacterCustomization } from "../character/_types";
import { CharacterCompositor } from "../character/CharacterCompositor";
import { CharacterAnimationManager } from "../character/CharacterAnimationManager";

export class Player extends Phaser.Physics.Arcade.Sprite {
    public id: string;
    public name: string;
    private sprite: string;
    public scene: Scene;
    private characterCustomization: CharacterCustomization | null = null;
    private isChangingSprite: boolean = false;
    x: number;
    y: number;
    vx: number;
    vy: number;
    targetPos = {
        x: this.x,
        y: this.y,
        vx: 0,
        vy: 0,
        t: Date.now(),
    };
    prevPos = { x: this.x, y: this.y, t: Date.now() };
    public availabilityStatus: AvailabilityStatus = AvailabilityStatus.ONLINE;
    private statusCircle: Phaser.GameObjects.Graphics;

    public isAttacking: boolean;
    public isRaisingHand: boolean = false;
    private raisHandGraphics: {
        bubble: Phaser.GameObjects.Graphics;
        emojiText: Phaser.GameObjects.Text;
    } | null = null;

    public playerProducerIds: string[];
    private nameText: Phaser.GameObjects.Text;
    voiceIndicator: Phaser.GameObjects.Image;
    uiContainer: Phaser.GameObjects.Container;

    moveSpeed: number;
    isLocal: boolean = true;
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

    wasd?: {
        up: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };

    constructor(
        scene: Scene,
        name: string | undefined,
        id: string,
        x: number,
        y: number,
        availabilityStatus: AvailabilityStatus,
        sprite: string,
        customization: CharacterCustomization | null,
        ops: { isLocal: boolean },
    ) {
        super(scene, x, y, sprite);

        this.name = name as string;
        this.availabilityStatus = availabilityStatus;
        this.characterCustomization = customization;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setMaxVelocity(500, 500);
        this.setBounce(0.1);
        this.setScale(1);
        this.setPushable(false);
        this.sprite = sprite;

        const w = Math.round(this.width * 1);
        const h = Math.round(this.height * 0.5);
        this.body!.setSize(w, h, true);
        this.body?.setOffset(0, this.height - h);

        console.log(`SETTING ID FOR ${name}`, id);
        this.id = id;
        this.scene = scene;

        this.moveSpeed = 600;
        this.isLocal = ops.isLocal;

        if (this.isLocal) {
            this.cursors = scene.input.keyboard!.createCursorKeys();
            this.wasd = {
                up: scene.input.keyboard!.addKey("W"),
                left: scene.input.keyboard!.addKey("A"),
                down: scene.input.keyboard!.addKey("S"),
                right: scene.input.keyboard!.addKey("D"),
            };
        }

        this.initializeNameTag();

        if (customization) {
            this.changeSprite(customization);
        } else {
            this.idleAnimation();
        }

        this.setupUiEventListener();
    }

    public changePlayerAvailabilityStatus(status: AvailabilityStatus) {
        this.availabilityStatus = status;
        if (this.statusCircle) {
            this.updateStatusCircle();
        }
    }

    public showReactionTag(data: ReactionData) {
        if (!data.reaction) {
            console.warn("No emoji provided");
            return;
        }

        if (data.playerId && data.playerId !== this.id) {
            console.log("Emoji not for this player");
            return;
        }

        if (data.reaction === "stop-raise-hand") {
            this.destroyReactionTagInstantly(
                this.raisHandGraphics!.bubble,
                this.raisHandGraphics!.emojiText,
            );
            return;
        }

        const emojiText = this.scene.add
            .text(0, -70, data.reaction, {
                font: "25px Arial",
                color: "#000000",
            })
            .setOrigin(0.5, 0.5);

        const textBounds = emojiText.getBounds();
        const padding = 12;
        const bubbleWidth = textBounds.width + padding * 2;
        const bubbleHeight = textBounds.height + padding * 2;
        const tailHeight = 10;

        const bubble = this.scene.add.graphics();

        this.createBubble(
            bubble,
            bubbleWidth,
            bubbleHeight,
            tailHeight,
            emojiText.x,
            emojiText.y,
        );

        this.uiContainer.add([bubble, emojiText]);

        bubble.setScale(0);
        emojiText.setScale(0);

        this.scene.tweens.add({
            targets: [bubble, emojiText],
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: "Back.easeOut",
        });

        this.uiContainer.add([bubble, emojiText]);

        if (data.reaction === "🤚") {
            this.isRaisingHand = true;
            this.raisHandGraphics = { bubble, emojiText };
        } else {
            this.destroyReactionTag(bubble, emojiText);
        }
    }

    private destroyReactionTag(
        bubble: Phaser.GameObjects.Graphics,
        emojiText: Phaser.GameObjects.Text,
    ) {
        this.scene.time.delayedCall(3000, () => {
            this.scene?.tweens?.add({
                targets: [bubble, emojiText],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    bubble.destroy();
                    emojiText.destroy();
                },
            });
        });
    }

    destroyReactionTagInstantly(
        bubble: Phaser.GameObjects.Graphics,
        emojiText: Phaser.GameObjects.Text,
    ) {
        this.scene?.tweens?.add({
            targets: [bubble, emojiText],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                bubble.destroy();
                emojiText.destroy();
            },
        });
    }

    private createBubble(
        graphics: Phaser.GameObjects.Graphics,
        width: number,
        height: number,
        tailHeight: number,
        x: number,
        y: number,
    ) {
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        const cornerRadius = 8;
        const bubbleX = x - width / 2;
        const bubbleY = y - height / 2;

        graphics.fillRoundedRect(bubbleX, bubbleY, width, height, cornerRadius);
        graphics.strokeRoundedRect(
            bubbleX,
            bubbleY,
            width,
            height,
            cornerRadius,
        );

        const tailX = x;
        const tailY = bubbleY + height;

        graphics.fillTriangle(
            tailX - 8,
            tailY,
            tailX + 8,
            tailY,
            tailX,
            tailY + tailHeight,
        );
        graphics.strokeTriangle(
            tailX - 8,
            tailY,
            tailX + 8,
            tailY,
            tailX,
            tailY + tailHeight,
        );
    }

    public initializeNameTag() {
        this.nameText = this.scene.add
            .text(0, 0, this.name, {
                font: "16px Arial",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 3,
            })
            .setOrigin(0.5, 0.5);

        this.statusCircle = this.scene.add.graphics();
        const circleRadius = 4;
        this.updateStatusCircle();

        const nameWidth = this.nameText.width;
        const nameHeight = this.nameText.height;
        const padding = 8;
        const gap = 6;
        const totalWidth = circleRadius * 2 + gap + nameWidth;
        const bgWidth = totalWidth + padding * 2;
        const bgHeight = nameHeight + padding * 2;

        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRoundedRect(
            -bgWidth / 2,
            -bgHeight / 2,
            bgWidth,
            bgHeight,
            8,
        );

        const circleX = -totalWidth / 2 + circleRadius;
        const nameX = circleX + circleRadius + gap + nameWidth / 2;

        this.statusCircle.setPosition(circleX, 0);
        this.nameText.setPosition(nameX, 0);

        this.uiContainer = this.scene.add.container(this.x, this.y - 50, [
            background,
            this.statusCircle,
            this.nameText,
        ]);

        this.uiContainer.setDepth(10);
    }

    private updateStatusCircle() {
        const displayRadius = 4;
        const drawRadius = 44;
        let statusColor: number;
        switch (this.availabilityStatus) {
            case AvailabilityStatus.ONLINE:
                statusColor = 0x00ff00;
                break;
            case AvailabilityStatus.FOCUS:
                statusColor = 0xff9500;
                break;
            default:
                statusColor = 0x00ff00;
        }

        this.statusCircle.clear();
        this.statusCircle.fillStyle(statusColor, 1);
        this.statusCircle.fillCircle(0, 0, drawRadius);
        this.statusCircle.setScale(displayRadius / drawRadius);
    }

    public showVoiceIndicator() {
        this.voiceIndicator.setVisible(true);
    }

    public hideVoiceIndicator() {
        this.voiceIndicator.setVisible(false);
    }

    public idleAnimation() {
        const animKey = IdleAnimationKeys[this.sprite];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.anims.play(animKey, true);
        }
    }

    // Helper to play generic or specific walk animations
    private playWalkAnimation(directionKey?: string) {
        if (!directionKey) {
            const animKey = WalkAnimationKeys[this.sprite]; // Default (usually down)
            if (animKey && this.scene.anims.exists(animKey)) {
                this.anims.play(animKey, true);
            }
            return;
        }

        const animKey = WalkAnimationKeys[directionKey];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.anims.play(animKey, true);
        } else {
            // Fallback to generic walk if specific direction missing
            const fallbackKey = WalkAnimationKeys[this.sprite];
            if (fallbackKey && this.scene.anims.exists(fallbackKey)) {
                this.anims.play(fallbackKey, true);
            }
        }
    }

    private attackAnimation() {
        const animKey = AttackAnimationKeys[this.sprite];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.anims.play(animKey, true);
        }
    }

    public async changeSprite(
        newCustomization: CharacterCustomization,
    ): Promise<void> {
        if (this.isChangingSprite) {
            return;
        }
        this.isChangingSprite = true;

        try {
            const compositor = new CharacterCompositor(this.scene);
            const animManager = new CharacterAnimationManager(this.scene);
            const characterKey = `custom-${this.id}`;
            const spritesheetKey = `${characterKey}-spritesheet`;

            await compositor.createAnimatedSpritesheet(
                newCustomization,
                spritesheetKey,
            );

            if (!this.scene.textures.exists(spritesheetKey)) {
                console.error(`Texture ${spritesheetKey} was not created`);
                return;
            }

            animManager.createCharacterAnimations(characterKey, spritesheetKey);
            animManager.updateAnimationKeys(characterKey);

            this.sprite = characterKey;
            this.setTexture(spritesheetKey);
            this.setFrame(0);
            this.characterCustomization = newCustomization;

            this.idleAnimation();
        } catch (error) {
            console.error("Error changing sprite:", error);
        } finally {
            this.isChangingSprite = false;
        }
    }

    private setupUiEventListener() {
        window.addEventListener("update-character", (event: Event) => {
            const customEvent = event as CustomEvent<CharacterCustomization>;
            if (this.isLocal && customEvent.detail) {
                this.changeSprite(customEvent.detail);
            }
        });
    }

    public update() {
        if (this.isLocal) {
            this.updateInput();
        } else {
            this.interpolateRemote();
        }
        this.uiContainer.setPosition(this.x, this.y - 40);
    }

    private updateInput() {
        const left = this.cursors!.left.isDown || this.wasd!.left.isDown;
        const right = this.cursors!.right.isDown || this.wasd!.right.isDown;
        const up = this.cursors!.up.isDown || this.wasd!.up.isDown;
        const down = this.cursors!.down.isDown || this.wasd!.down.isDown;
        const space = this.cursors!.space.isDown;

        let vx = 0;
        let vy = 0;
        if (left) vx -= this.moveSpeed;
        if (right) vx += this.moveSpeed;
        if (up) vy -= this.moveSpeed;
        if (down) vy += this.moveSpeed;

        const attackAnimKey = AttackAnimationKeys[this.sprite];
        const isAnimateAttacking =
            this.anims.currentAnim?.key === attackAnimKey;

        if (isAnimateAttacking && this.anims.isPlaying) {
            return;
        }

        if (this.isAttacking) {
            this.isAttacking = false;
        }

        // Logic for Walking Directions
        // Note: We do NOT use setFlipX(true) for left because the sprite sheet
        // has specific "Walk Left" frames. We ensure flip is false so it draws correctly.
        if (left || right || up || down) {
            if (up) {
                this.setFlipX(false);
                this.playWalkAnimation(`${this.sprite}_UP`);
            } else if (down) {
                this.setFlipX(false);
                this.playWalkAnimation(`${this.sprite}_DOWN`);
            } else if (left) {
                this.setFlipX(false); // Do not flip; use the drawn left frames
                this.playWalkAnimation(`${this.sprite}_LEFT`);
            } else if (right) {
                this.setFlipX(false);
                this.playWalkAnimation(`${this.sprite}_RIGHT`);
            }
        } else if (space) {
            const currentAnimKey = this.anims.currentAnim?.key;
            if (currentAnimKey !== attackAnimKey) {
                this.isAttacking = true;
                this.attackAnimation();
            }
        } else {
            const idleAnimKey = IdleAnimationKeys[this.sprite];
            const currentAnimKey = this.anims.currentAnim?.key;
            if (currentAnimKey !== idleAnimKey) {
                this.idleAnimation();
            }
        }

        // normalize diagonal movement
        if (vx !== 0 && vy !== 0) {
            vx *= Math.SQRT1_2;
            vy *= Math.SQRT1_2;
        }

        this.setVelocity(vx, vy);
        this.vx = vx;
        this.vy = vy;
    }

    private interpolateRemote() {
        const attackAnimKey = AttackAnimationKeys[this.sprite];
        const isAnimateAttacking =
            this.anims.currentAnim?.key === attackAnimKey;

        if (isAnimateAttacking && this.anims.isPlaying) {
            return;
        }

        if (!this.targetPos) return;

        const now = Date.now();
        const elapsed = (now - this.targetPos.t) / 1000;

        const predictedX =
            this.targetPos.x + (this.targetPos.vx || 0) * elapsed;
        const predictedY =
            this.targetPos.y + (this.targetPos.vy || 0) * elapsed;

        const lerpFactor = 0.2;
        this.x += (predictedX - this.x) * lerpFactor;
        this.y += (predictedY - this.y) * lerpFactor;

        // Remote Movement Logic
        const isMoving =
            Math.abs(this.targetPos.vx || 0) > 10 ||
            Math.abs(this.targetPos.vy || 0) > 10;

        const currentAnimKey = this.anims.currentAnim?.key;

        // Use velocity to determine direction for remote players
        if (isMoving) {
            this.setFlipX(false);
            const vx = this.targetPos.vx || 0;
            const vy = this.targetPos.vy || 0;

            // Prioritize the axis with larger movement
            if (Math.abs(vx) > Math.abs(vy)) {
                if (vx > 0) this.playWalkAnimation(`${this.sprite}_RIGHT`);
                else this.playWalkAnimation(`${this.sprite}_LEFT`);
            } else {
                if (vy > 0) this.playWalkAnimation(`${this.sprite}_DOWN`);
                else this.playWalkAnimation(`${this.sprite}_UP`);
            }
        } else {
            const idleAnimKey = IdleAnimationKeys[this.sprite];
            if (currentAnimKey !== idleAnimKey) {
                this.idleAnimation();
            }
        }
    }

    public destroy() {
        this.uiContainer.destroy();
        super.destroy();
    }
}
