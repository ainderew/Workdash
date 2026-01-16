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
    private isChangingSprite: boolean = false;
    public lastFacingDirection: FacingDirection = FacingDirection.DOWN;

    // Visual Smoothing
    public visualSprite: Phaser.GameObjects.Sprite;

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

    // The Outline Sprite
    public teamGlow: Phaser.GameObjects.Sprite | null = null;
    public team: "red" | "blue" | "spectator" | null = null;

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
    public soccerStats: {
        speed: number;
        kickPower: number;
        dribbling: number;
    } | null = null;

    moveSpeed: number;
    private baseMoveSpeed: number = 600;
    private readonly BASE_ACCEL: number = 1600;
    private readonly BASE_MAX_SPEED: number = 600;
    private readonly PLAYER_DRAG: number = 4;
    private kartSpeedMultiplier: number = 1.5;
    isLocal: boolean = true;

    // Sequence tracking for reconciliation
    private inputHistory: Array<{
        sequence: number;
        up: boolean;
        down: boolean;
        left: boolean;
        right: boolean;
    }> = [];
    public currentSequence: number = 0;

    // Snapshot Interpolation for remote players
    private snapshotBuffer: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        timestamp: number;
    }> = [];
    private readonly INTERPOLATION_OFFSET = 100; // 100ms render delay for smoothness

    // Visual smoothing for reconciliation snaps
    private visualOffsetX: number = 0;
    private visualOffsetY: number = 0;

    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

    wasd?: {
        up: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };

    kartKey?: Phaser.Input.Keyboard.Key;
    public isKartMode: boolean = false;
    public isGhosted: boolean = false;
    public isSpectator: boolean = false;

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

        // --- Visual/Physics Separation ---
        // 'this' is the physics body. We make it invisible.
        this.setAlpha(0);

        // Create the actual visible sprite
        this.visualSprite = scene.add.sprite(x, y, sprite);
        this.visualSprite.setDepth(10); // Match player depth

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

        this.moveSpeed = this.baseMoveSpeed;
        this.isLocal = ops.isLocal;

        if (this.isLocal) {
            this.cursors = scene.input.keyboard!.createCursorKeys();
            this.wasd = {
                up: scene.input.keyboard!.addKey("W"),
                left: scene.input.keyboard!.addKey("A"),
                down: scene.input.keyboard!.addKey("S"),
                right: scene.input.keyboard!.addKey("D"),
            };
            this.kartKey = scene.input.keyboard!.addKey("K");
        }

        this.initializeNameTag();

        // FIX: Set explicit positive depth to ensure player is above background
        this.setDepth(10);

        if (customization) {
            this.changeSprite(customization);
        } else {
            this.idleAnimation();
        }

        this.setupUiEventListener();
    }

    public setScale(x: number, y?: number): this {
        super.setScale(x, y);
        if (this.visualSprite) {
            this.visualSprite.setScale(x, y);
        }
        return this;
    }

    public setFlipX(value: boolean): this {
        if (this.visualSprite) {
            this.visualSprite.setFlipX(value);
        }
        return this;
    }

    public setAlpha(value?: number): this {
        // Keep the physics body alpha 0
        super.setAlpha(0);
        if (this.visualSprite && value !== undefined) {
            this.visualSprite.setAlpha(value);
        }
        return this;
    }

    public setTint(color: number): this {
        if (this.visualSprite) {
            this.visualSprite.setTint(color);
        }
        return this;
    }

    public clearTint(): this {
        if (this.visualSprite) {
            this.visualSprite.clearTint();
        }
        return this;
    }

    public setDepth(value: number): this {
        super.setDepth(value);
        if (this.visualSprite) {
            this.visualSprite.setDepth(value);
        }
        return this;
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

    public destroyNameTag() {
        this.uiContainer.destroy();
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

    public setTeam(team: "red" | "blue" | "spectator" | null) {
        this.team = team;

        if (team === "spectator") {
            this.setAlpha(0.5);
        } else {
            this.setAlpha(1.0);
        }

        this.updateTeamGlow();
    }

    private updateTeamGlow() {
        if (this.teamGlow) {
            this.teamGlow.destroy();
            this.teamGlow = null;
        }

        if (this.team === "red" || this.team === "blue") {
            this.teamGlow = this.scene.add.sprite(
                this.x,
                this.y,
                this.texture.key,
                this.frame.name,
            );

            const glowColor = this.team === "red" ? 0xff0000 : 0x0066ff;

            // FIX: Use setTintFill for a SOLID color silhouette (better for outlines)
            this.teamGlow.setTintFill(glowColor);

            this.teamGlow.setAlpha(0.6);

            // FIX: Set depth relative to the new Player depth (10 - 1 = 9)
            // This ensures it is above the background (depth 0)
            this.teamGlow.setDepth(this.depth - 1);
        }
    }

    public showVoiceIndicator() {
        this.voiceIndicator.setVisible(true);
    }

    public hideVoiceIndicator() {
        this.voiceIndicator.setVisible(false);
    }

    public idleAnimation(direction?: FacingDirection) {
        const dir = direction || this.lastFacingDirection;

        if (this.isKartMode) {
            const kartDirection = dir.toLowerCase();
            const kartAnimKey = `${this.sprite}-kart-${kartDirection}`;
            if (this.scene.anims.exists(kartAnimKey)) {
                this.visualSprite.anims.play(kartAnimKey, true);
                return;
            }
        }

        const directionKey = `${this.sprite}_${dir}`;
        const animKey = IdleAnimationKeys[directionKey];

        if (animKey && this.scene.anims.exists(animKey)) {
            this.visualSprite.anims.play(animKey, true);
        } else {
            const fallbackKey = IdleAnimationKeys[this.sprite];
            if (fallbackKey && this.scene.anims.exists(fallbackKey)) {
                this.visualSprite.anims.play(fallbackKey, true);
            }
        }
    }

    private playWalkAnimation(
        directionKey?: string,
        useKartMode: boolean = false,
    ) {
        if (useKartMode) {
            let direction = "down";
            if (directionKey) {
                const parts = directionKey.split("_");
                if (parts.length > 1) {
                    direction = parts[parts.length - 1].toLowerCase();
                }
            }
            const kartAnimKey = `${this.sprite}-kart-${direction}`;
            if (this.scene.anims.exists(kartAnimKey)) {
                this.visualSprite.anims.play(kartAnimKey, true);
                return;
            }
        }

        if (!directionKey) {
            const animKey = WalkAnimationKeys[this.sprite];
            if (animKey && this.scene.anims.exists(animKey)) {
                this.visualSprite.anims.play(animKey, true);
            }
            return;
        }

        const animKey = WalkAnimationKeys[directionKey];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.visualSprite.anims.play(animKey, true);
        } else {
            const fallbackKey = WalkAnimationKeys[this.sprite];
            if (fallbackKey && this.scene.anims.exists(fallbackKey)) {
                this.visualSprite.anims.play(fallbackKey, true);
            }
        }
    }

    private attackAnimation() {
        const animKey = AttackAnimationKeys[this.sprite];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.visualSprite.anims.play(animKey, true);
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
                this.isLocal,
            );

            if (!this.scene.textures.exists(spritesheetKey)) {
                console.error(`Texture ${spritesheetKey} was not created`);
                return;
            }

            animManager.createCharacterAnimations(characterKey, spritesheetKey);
            animManager.updateAnimationKeys(characterKey);

            this.sprite = characterKey;
            this.setTexture(spritesheetKey);
            this.visualSprite.setTexture(spritesheetKey);
            this.visualSprite.setFrame(0);
            this.idleAnimation();

            // IMPORTANT: Update glow texture if the player sprite changes
            if (this.teamGlow) {
                this.teamGlow.setTexture(spritesheetKey);
            }
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

        // --- Visual Error Decay ---
        // Adaptive decay: faster for small errors, slower for large errors
        const errorMagnitude = Math.sqrt(
            this.visualOffsetX ** 2 + this.visualOffsetY ** 2,
        );

        // Decay factor: 0.9 for large errors (>50px), 0.8 for medium, 0.7 for small
        let decayFactor: number;
        if (errorMagnitude > 50) {
            decayFactor = 0.92; // Very slow decay for big snaps
        } else if (errorMagnitude > 20) {
            decayFactor = 0.88;
        } else if (errorMagnitude > 5) {
            decayFactor = 0.82;
        } else {
            decayFactor = 0.7; // Fast decay when close
        }

        this.visualOffsetX *= decayFactor;
        this.visualOffsetY *= decayFactor;

        // Snap to zero when very small to avoid floating point drift
        if (Math.abs(this.visualOffsetX) < 0.5) this.visualOffsetX = 0;
        if (Math.abs(this.visualOffsetY) < 0.5) this.visualOffsetY = 0;

        // Visual sprite follows physics body with offset
        this.visualSprite.x = this.x + this.visualOffsetX;
        this.visualSprite.y = this.y + this.visualOffsetY;

        // Apply drag matching server in multiplayer scenes (like SoccerMap)
        if (this.scene.scene.key === "SoccerMap" && this.body) {
            this.applyExponentialDrag(1 / 60);
        }

        this.uiContainer.setPosition(
            this.visualSprite.x,
            this.visualSprite.y - 40,
        );

        // --- GHOST EFFECT ---
        if (this.isGhosted || this.isSpectator) {
            this.visualSprite.setAlpha(this.isGhosted ? 0.4 : 0.5);
            if (this.isGhosted) {
                this.visualSprite.setTint(0x000000);
            } else {
                this.visualSprite.clearTint();
            }
        } else {
            this.visualSprite.setAlpha(1.0);
            this.visualSprite.clearTint();
        }

        // --- GLOW UPDATE LOOP ---
        if (this.teamGlow && this.team) {
            this.teamGlow.setPosition(this.visualSprite.x, this.visualSprite.y);
            this.teamGlow.setFrame(this.visualSprite.frame.name);
            this.teamGlow.setFlipX(this.visualSprite.flipX);
            this.teamGlow.setDepth(this.visualSprite.depth - 1);
            this.teamGlow.setScale(
                this.visualSprite.scaleX * 1.15,
                this.visualSprite.scaleY * 1.15,
            );
        }
    }

    private updateInput() {
        const isCommandPaletteOpen = useUiStore.getState().isCommandPaletteOpen;
        if (isCommandPaletteOpen) {
            this.setVelocity(0, 0);
            this.setAcceleration(0, 0);
            return;
        }

        const isSoccerMap = this.scene.scene.key === "SoccerMap";

        if (this.kartKey && Phaser.Input.Keyboard.JustDown(this.kartKey)) {
            this.isKartMode = !this.isKartMode;
            this.moveSpeed = this.isKartMode
                ? this.baseMoveSpeed * this.kartSpeedMultiplier
                : this.baseMoveSpeed;

            if (this.isKartMode) {
                this.scene.sound.play("kart_start", { volume: 0.1 });
            }
            this.idleAnimation();
        }

        const left = this.cursors!.left.isDown || this.wasd!.left.isDown;
        const right = this.cursors!.right.isDown || this.wasd!.right.isDown;
        const up = this.cursors!.up.isDown || this.wasd!.up.isDown;
        const down = this.cursors!.down.isDown || this.wasd!.down.isDown;
        const space = this.cursors!.space.isDown;

        let vx = 0;
        let vy = 0;
        let ax = 0;
        let ay = 0;

        const speedStat = this.soccerStats?.speed ?? 0;
        const speedMultiplier = 1.0 + speedStat * 0.1;
        const accel = this.BASE_ACCEL * speedMultiplier;
        const maxSpeed = this.BASE_MAX_SPEED * speedMultiplier;

        if (left) {
            vx -= this.moveSpeed;
            ax -= accel;
        }
        if (right) {
            vx += this.moveSpeed;
            ax += accel;
        }
        if (up) {
            vy -= this.moveSpeed;
            ay -= accel;
        }
        if (down) {
            vy += this.moveSpeed;
            ay += accel;
        }

        const attackAnimKey = AttackAnimationKeys[this.sprite];
        const isAnimateAttacking =
            this.visualSprite.anims.currentAnim?.key === attackAnimKey;

        if (isAnimateAttacking && this.visualSprite.anims.isPlaying) {
            return;
        }

        if (this.isAttacking) {
            this.isAttacking = false;
        }

        if (left || right || up || down) {
            if (up) {
                this.visualSprite.setFlipX(false);
                this.lastFacingDirection = FacingDirection.UP;
                this.playWalkAnimation(`${this.sprite}_UP`, this.isKartMode);
            } else if (down) {
                this.visualSprite.setFlipX(false);
                this.lastFacingDirection = FacingDirection.DOWN;
                this.playWalkAnimation(`${this.sprite}_DOWN`, this.isKartMode);
            } else if (left) {
                this.visualSprite.setFlipX(false);
                this.lastFacingDirection = FacingDirection.LEFT;
                this.playWalkAnimation(`${this.sprite}_LEFT`, this.isKartMode);
            } else if (right) {
                this.visualSprite.setFlipX(false);
                this.lastFacingDirection = FacingDirection.RIGHT;
                this.playWalkAnimation(`${this.sprite}_RIGHT`, this.isKartMode);
            }
        } else if (space) {
            const currentAnimKey = this.visualSprite.anims.currentAnim?.key;
            if (currentAnimKey !== attackAnimKey) {
                this.isAttacking = true;
                this.attackAnimation();
            }
        } else {
            const idleAnimKey =
                IdleAnimationKeys[`${this.sprite}_${this.lastFacingDirection}`];
            const currentAnimKey = this.visualSprite.anims.currentAnim?.key;
            if (currentAnimKey !== idleAnimKey) {
                this.idleAnimation();
            }
        }

        if (isSoccerMap) {
            if (ax !== 0 && ay !== 0) {
                ax *= Math.SQRT1_2;
                ay *= Math.SQRT1_2;
            }
            this.setAcceleration(ax, ay);
            this.setMaxVelocity(maxSpeed, maxSpeed);

            // Record for reconciliation
            this.inputHistory.push({
                sequence: this.currentSequence,
                up,
                down,
                left,
                right,
            });

            // Cap history at 1 second
            if (this.inputHistory.length > 60) {
                this.inputHistory.shift();
            }
        } else {
            if (vx !== 0 && vy !== 0) {
                vx *= Math.SQRT1_2;
                vy *= Math.SQRT1_2;
            }
            this.setVelocity(vx, vy);
        }
    }

    public reconcile(
        serverX: number,
        serverY: number,
        serverVX: number,
        serverVY: number,
        lastSequence: number,
    ) {
        if (!this.isLocal || !this.body) return;

        // 1. Remove history acknowledged by server
        this.inputHistory = this.inputHistory.filter(
            (input) => input.sequence > lastSequence,
        );

        // 2. Calculate prediction error BEFORE we modify position
        // Re-simulate from server state to get our predicted position
        let predictedX = serverX;
        let predictedY = serverY;
        let predictedVX = serverVX;
        let predictedVY = serverVY;

        const dt = 1 / 60;
        const speedStat = this.soccerStats?.speed ?? 0;
        const speedMultiplier = 1.0 + speedStat * 0.1;
        const accel = this.BASE_ACCEL * speedMultiplier;
        const maxSpeed = this.BASE_MAX_SPEED * speedMultiplier;
        const dribblingStat = this.soccerStats?.dribbling ?? 0;
        const dragMultiplier = Math.max(0.5, 1.0 - dribblingStat * 0.05);

        for (const input of this.inputHistory) {
            let ax = 0;
            let ay = 0;
            if (input.left) ax -= accel;
            if (input.right) ax += accel;
            if (input.up) ay -= accel;
            if (input.down) ay += accel;

            if (ax !== 0 && ay !== 0) {
                ax *= Math.SQRT1_2;
                ay *= Math.SQRT1_2;
            }

            // Velocity update
            predictedVX += ax * dt;
            predictedVY += ay * dt;

            // Drag
            const dragFactor = Math.exp(-this.PLAYER_DRAG * dragMultiplier * dt);
            predictedVX *= dragFactor;
            predictedVY *= dragFactor;

            // Speed clamp
            const currentSpeed = Math.sqrt(predictedVX ** 2 + predictedVY ** 2);
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                predictedVX *= scale;
                predictedVY *= scale;
            }

            // Position update
            predictedX += predictedVX * dt;
            predictedY += predictedVY * dt;
        }

        // 3. Calculate error between our current position and where we SHOULD be
        const errorX = this.x - predictedX;
        const errorY = this.y - predictedY;
        const errorDistance = Math.sqrt(errorX * errorX + errorY * errorY);

        // 4. Only correct if error is significant
        if (errorDistance < 2) {
            // We're close enough, just sync velocity
            this.setVelocity(predictedVX, predictedVY);
            return;
        }

        // 5. Store visual position before snap
        const oldVisualX = this.visualSprite.x;
        const oldVisualY = this.visualSprite.y;

        // 6. Snap physics to predicted position
        this.setPosition(predictedX, predictedY);
        this.setVelocity(predictedVX, predictedVY);
        this.body.updateFromGameObject();

        // 7. Visual Error Compensation - keep visual sprite where it was
        this.visualOffsetX = oldVisualX - this.x;
        this.visualOffsetY = oldVisualY - this.y;

        // Debug logging for large corrections
        if (errorDistance > 20) {
            console.log(
                `[Reconcile] Large correction: ${errorDistance.toFixed(1)}px, pending inputs: ${this.inputHistory.length}`,
            );
        }
    }

    private applyExponentialDrag(dt: number) {
        if (!this.body || this.isSpectator) return;

        // Match server's exponential drag
        const dribblingStat = this.soccerStats?.dribbling ?? 0;
        // Dribbling reduces drag: 0 stat = 1.0x drag, 10 stat = 0.5x drag
        const dragMultiplier = Math.max(0.5, 1.0 - dribblingStat * 0.05);

        const dragFactor = Math.exp(-this.PLAYER_DRAG * dragMultiplier * dt);

        const vx = this.body.velocity.x * dragFactor;
        const vy = this.body.velocity.y * dragFactor;

        this.setVelocity(vx, vy);
    }

    private interpolateRemote() {
        const attackAnimKey = AttackAnimationKeys[this.sprite];
        const isAnimateAttacking =
            this.visualSprite.anims.currentAnim?.key === attackAnimKey;

        if (isAnimateAttacking && this.visualSprite.anims.isPlaying) {
            return;
        }

        if (this.isAttacking && !this.visualSprite.anims.isPlaying) {
            this.isAttacking = false;
        }

        if (this.isAttacking && !isAnimateAttacking) {
            this.attackAnimation();
            return;
        }

        if (this.snapshotBuffer.length < 2) return;

        const renderTime = Date.now() - this.INTERPOLATION_OFFSET;

        // Drop old snapshots
        while (
            this.snapshotBuffer.length > 2 &&
            this.snapshotBuffer[1].timestamp < renderTime
        ) {
            this.snapshotBuffer.shift();
        }

        const s0 = this.snapshotBuffer[0];
        const s1 = this.snapshotBuffer[1];

        if (renderTime < s0.timestamp) {
            // We are behind the oldest snapshot, just stay at s0
            this.setPosition(s0.x, s0.y);
        } else if (renderTime > s1.timestamp) {
            // We are ahead of the latest snapshot (lagging), extrapolate or stay at s1
            const dt = (renderTime - s1.timestamp) / 1000;
            this.setPosition(s1.x + s1.vx * dt, s1.y + s1.vy * dt);
        } else {
            // Interpolate
            const total = s1.timestamp - s0.timestamp;
            const fraction = (renderTime - s0.timestamp) / total;

            const x = Phaser.Math.Linear(s0.x, s1.x, fraction);
            const y = Phaser.Math.Linear(s0.y, s1.y, fraction);

            this.setPosition(x, y);

            // Animation logic based on velocity
            const vx = s1.vx;
            const vy = s1.vy;
            const isMoving = Math.abs(vx) > 10 || Math.abs(vy) > 10;

            if (isMoving) {
                this.visualSprite.setFlipX(false);
                if (Math.abs(vx) > Math.abs(vy)) {
                    if (vx > 0) {
                        this.lastFacingDirection = FacingDirection.RIGHT;
                        this.playWalkAnimation(
                            `${this.sprite}_RIGHT`,
                            this.isKartMode,
                        );
                    } else {
                        this.lastFacingDirection = FacingDirection.LEFT;
                        this.playWalkAnimation(
                            `${this.sprite}_LEFT`,
                            this.isKartMode,
                        );
                    }
                } else {
                    if (vy > 0) {
                        this.lastFacingDirection = FacingDirection.DOWN;
                        this.playWalkAnimation(
                            `${this.sprite}_DOWN`,
                            this.isKartMode,
                        );
                    } else {
                        this.lastFacingDirection = FacingDirection.UP;
                        this.playWalkAnimation(
                            `${this.sprite}_UP`,
                            this.isKartMode,
                        );
                    }
                }
            } else {
                this.idleAnimation();
            }
        }

        // Sync physics body
        if (this.body) {
            this.body.updateFromGameObject();
        }
    }

    public pushSnapshot(snapshot: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        timestamp: number;
    }) {
        this.snapshotBuffer.push(snapshot);
        if (this.snapshotBuffer.length > 20) {
            this.snapshotBuffer.shift();
        }
    }

    public destroy() {
        if (this.teamGlow) {
            this.teamGlow.destroy();
        }
        if (this.visualSprite) {
            this.visualSprite.destroy();
        }
        this.uiContainer.destroy();
        super.destroy();
    }
}
