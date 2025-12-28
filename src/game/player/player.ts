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
import { EVENT_TYPES } from "../character/_enums";
import useUiStore from "@/common/store/uiStore";

export enum FacingDirection {
    UP = "UP",
    DOWN = "DOWN",
    LEFT = "LEFT",
    RIGHT = "RIGHT",
}

export class Player extends Phaser.Physics.Arcade.Sprite {
    public id: string;
    public name: string;
    private sprite: string;
    public scene: Scene;
    // private characterCustomization: CharacterCustomization | null = null;
    private isChangingSprite: boolean = false;
    private lastFacingDirection: FacingDirection = FacingDirection.DOWN;

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
        this.depth = 0;

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
        let color = "#ffffff";
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }

        if (this.isLocal) {
            color = "#00f55a";
        }

        this.nameText = this.scene.add
            .text(0, 0, this.name, {
                font: "16px Arial",
                color,
                stroke: "#000000",
                strokeThickness: 3,
            })
            .setOrigin(0.5, 0.5);

        this.statusCircle = this.scene.add.graphics();
        this.updateStatusCircle();

        const nameWidth = this.nameText.width;
        const nameHeight = this.nameText.height;
        const circleRadius = 4;
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

        this.uiContainer.setDepth(200);
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

    public idleAnimation(direction?: FacingDirection) {
        const dir = direction || this.lastFacingDirection;
        const directionKey = `${this.sprite}_${dir}`;

        const animKey = IdleAnimationKeys[directionKey];

        if (animKey && this.scene.anims.exists(animKey)) {
            this.anims.play(animKey, true);
        } else {
            const fallbackKey = IdleAnimationKeys[this.sprite];
            if (fallbackKey && this.scene.anims.exists(fallbackKey)) {
                this.anims.play(fallbackKey, true);
            }
        }
    }

    private playWalkAnimation(directionKey?: string) {
        if (!directionKey) {
            const animKey = WalkAnimationKeys[this.sprite];
            if (animKey && this.scene.anims.exists(animKey)) {
                this.anims.play(animKey, true);
            }
            return;
        }

        const animKey = WalkAnimationKeys[directionKey];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.anims.play(animKey, true);
        } else {
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
                this.isLocal, // Only update global store for local player
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
            this.idleAnimation();
        } catch (error) {
            console.error("Error changing sprite:", error);
        } finally {
            this.isChangingSprite = false;
        }
    }

    private setupUiEventListener() {
        window.addEventListener(
            EVENT_TYPES.UPDATE_CHARACTER,
            (event: Event) => {
                const customEvent =
                    event as CustomEvent<CharacterCustomization>;
                if (this.isLocal && customEvent.detail) {
                    this.changeSprite(customEvent.detail);
                }
            },
        );

        window.addEventListener(EVENT_TYPES.UPDATE_NAME, (event: Event) => {
            const customEvent = event as CustomEvent<{ newName: string }>;
            console.log(customEvent);

            if (this.isLocal && customEvent.detail) {
                this.name = customEvent.detail.newName;
                this.initializeNameTag();
            }
        });
    }

    public update() {
        if (this.isLocal) {
            this.updateInput();
            this.vx = this.body!.velocity.x;
            this.vy = this.body!.velocity.y;
        } else {
            this.interpolateRemote();
        }
        this.uiContainer.setPosition(this.x, this.y - 40);
    }

    private updateInput() {
        const isCommandPaletteOpen = useUiStore.getState().isCommandPaletteOpen;
        if (isCommandPaletteOpen) {
            this.setVelocity(0, 0);
            return;
        }

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

        if (left || right || up || down) {
            if (up) {
                this.setFlipX(false);
                this.lastFacingDirection = FacingDirection.UP;
                this.playWalkAnimation(`${this.sprite}_UP`);
            } else if (down) {
                this.setFlipX(false);
                this.lastFacingDirection = FacingDirection.DOWN;
                this.playWalkAnimation(`${this.sprite}_DOWN`);
            } else if (left) {
                this.setFlipX(false);
                this.lastFacingDirection = FacingDirection.LEFT;
                this.playWalkAnimation(`${this.sprite}_LEFT`);
            } else if (right) {
                this.setFlipX(false);
                this.lastFacingDirection = FacingDirection.RIGHT;
                this.playWalkAnimation(`${this.sprite}_RIGHT`);
            }
        } else if (space) {
            const currentAnimKey = this.anims.currentAnim?.key;
            if (currentAnimKey !== attackAnimKey) {
                this.isAttacking = true;
                this.attackAnimation();
            }
        } else {
            const idleAnimKey =
                IdleAnimationKeys[`${this.sprite}_${this.lastFacingDirection}`];
            const currentAnimKey = this.anims.currentAnim?.key;
            if (currentAnimKey !== idleAnimKey) {
                this.idleAnimation();
            }
        }

        if (vx !== 0 && vy !== 0) {
            vx *= Math.SQRT1_2;
            vy *= Math.SQRT1_2;
        }

        this.setVelocity(vx, vy);
    }

    private interpolateRemote() {
        const attackAnimKey = AttackAnimationKeys[this.sprite];
        const isAnimateAttacking =
            this.anims.currentAnim?.key === attackAnimKey;

        if (isAnimateAttacking && this.anims.isPlaying) {
            return;
        }

        if (this.isAttacking && !this.anims.isPlaying) {
            this.isAttacking = false;
        }

        if (this.isAttacking && !isAnimateAttacking) {
            this.attackAnimation();
            return;
        }

        if (!this.targetPos) return;

        const predictedX = this.targetPos.x;
        const predictedY = this.targetPos.y;

        const distance = Math.sqrt(
            Math.pow(predictedX - this.x, 2) + Math.pow(predictedY - this.y, 2),
        );

        if (distance > 200) {
            this.x = predictedX;
            this.y = predictedY;
        } else {
            const baseLerp = 0.2;
            const lerpFactor = Math.min(baseLerp + distance / 500, 0.5);

            this.x += (predictedX - this.x) * lerpFactor;
            this.y += (predictedY - this.y) * lerpFactor;
        }
        const isMoving =
            Math.abs(this.targetPos.vx || 0) > 10 ||
            Math.abs(this.targetPos.vy || 0) > 10;

        const currentAnimKey = this.anims.currentAnim?.key;

        if (isMoving) {
            this.setFlipX(false);
            const vx = this.targetPos.vx || 0;
            const vy = this.targetPos.vy || 0;

            if (Math.abs(vx) > Math.abs(vy)) {
                if (vx > 0) {
                    this.lastFacingDirection = FacingDirection.RIGHT;
                    this.playWalkAnimation(`${this.sprite}_RIGHT`);
                } else {
                    this.lastFacingDirection = FacingDirection.LEFT;
                    this.playWalkAnimation(`${this.sprite}_LEFT`);
                }
            } else {
                if (vy > 0) {
                    this.lastFacingDirection = FacingDirection.DOWN;
                    this.playWalkAnimation(`${this.sprite}_DOWN`);
                } else {
                    this.lastFacingDirection = FacingDirection.UP;
                    this.playWalkAnimation(`${this.sprite}_UP`);
                }
            }
        } else {
            const idleAnimKey =
                IdleAnimationKeys[`${this.sprite}_${this.lastFacingDirection}`];
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
