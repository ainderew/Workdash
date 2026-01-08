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
                this.anims.play(kartAnimKey, true);
                return;
            }
        }

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
                this.anims.play(kartAnimKey, true);
                return;
            }
        }

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
            this.setFrame(0);
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

        // Apply drag matching server in multiplayer scenes (like SoccerMap)
        if (this.scene.scene.key === "SoccerMap" && this.body) {
            this.applyExponentialDrag(1 / 60);
        }

        this.uiContainer.setPosition(this.x, this.y - 40);

        // --- GHOST EFFECT ---
        // Treat unassigned (null) same as spectator
        if (this.isGhosted || this.isSpectator) {
            this.setAlpha(this.isGhosted ? 0.4 : 0.5);
            if (this.isGhosted) {
                this.setTint(0x000000); // Black tint for shadow look
            } else {
                this.clearTint();
            }
        } else {
            this.setAlpha(1.0);
            this.clearTint();
        }

        // --- GLOW UPDATE LOOP ---
        if (this.teamGlow && this.team) {
            // 1. Sync Position
            this.teamGlow.setPosition(this.x, this.y);

            // 2. Sync Frame (Copy exactly what the player is doing)
            this.teamGlow.setFrame(this.frame.name);
            this.teamGlow.setFlipX(this.flipX);

            // 3. Sync Depth (ensure it stays just behind the player if depth changes)
            this.teamGlow.setDepth(this.depth - 1);

            // 4. Scale Effect
            // Using 1.15 to ensure it sticks out visibly around the edges
            this.teamGlow.setScale(this.scaleX * 1.15, this.scaleY * 1.15);
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
                this.playWalkAnimation(`${this.sprite}_UP`, this.isKartMode);
            } else if (down) {
                this.setFlipX(false);
                this.lastFacingDirection = FacingDirection.DOWN;
                this.playWalkAnimation(`${this.sprite}_DOWN`, this.isKartMode);
            } else if (left) {
                this.setFlipX(false);
                this.lastFacingDirection = FacingDirection.LEFT;
                this.playWalkAnimation(`${this.sprite}_LEFT`, this.isKartMode);
            } else if (right) {
                this.setFlipX(false);
                this.lastFacingDirection = FacingDirection.RIGHT;
                this.playWalkAnimation(`${this.sprite}_RIGHT`, this.isKartMode);
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

        // 2. Snap physics state to server truth
        this.setPosition(serverX, serverY);
        this.setVelocity(serverVX, serverVY);

        // 3. Re-run all pending inputs (Fast-Forward)
        // Since we are in the update loop, we simulate the effect of these inputs
        // This is a simplified version; in a perfect world, we'd run a separate physics step
        const dt = 1 / 60;
        const speedStat = this.soccerStats?.speed ?? 0;
        const speedMultiplier = 1.0 + speedStat * 0.1;
        const accel = this.BASE_ACCEL * speedMultiplier;

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

            // Apply acceleration to velocity
            const newVX = this.body.velocity.x + ax * dt;
            const newVY = this.body.velocity.y + ay * dt;

            // Apply drag (same as server)
            const dribblingStat = this.soccerStats?.dribbling ?? 0;
            const dragMultiplier = Math.max(0.5, 1.0 - dribblingStat * 0.05);
            const dragFactor = Math.exp(
                -this.PLAYER_DRAG * dragMultiplier * dt,
            );

            this.body.velocity.x = newVX * dragFactor;
            this.body.velocity.y = newVY * dragFactor;

            // Clamp speed
            const currentSpeed = Math.sqrt(
                this.body.velocity.x ** 2 + this.body.velocity.y ** 2,
            );
            const maxSpeed = this.BASE_MAX_SPEED * speedMultiplier;
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                this.body.velocity.x *= scale;
                this.body.velocity.y *= scale;
            }

            // Move position
            this.x += this.body.velocity.x * dt;
            this.y += this.body.velocity.y * dt;
        }

        // 4. Update the physics body to match the new gameObject position
        this.body.updateFromGameObject();
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

        // Calculate how old this target position is
        const updateAge = Date.now() - this.targetPos.t;

        // Extrapolate position based on velocity and update age
        const extrapolatedX =
            this.targetPos.x + this.targetPos.vx * (updateAge / 1000);
        const extrapolatedY =
            this.targetPos.y + this.targetPos.vy * (updateAge / 1000);

        const distance = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            extrapolatedX,
            extrapolatedY,
        );

        if (distance > 250) {
            this.x = extrapolatedX;
            this.y = extrapolatedY;
        } else {
            const baseLerp = 0.25;
            this.x = Phaser.Math.Interpolation.Linear(
                [this.x, extrapolatedX],
                baseLerp,
            );
            this.y = Phaser.Math.Interpolation.Linear(
                [this.y, extrapolatedY],
                baseLerp,
            );
        }

        // Sync physics body with sprite position
        if (this.body) {
            this.body.updateFromGameObject();
        }

        // Animation code
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
            const idleAnimKey =
                IdleAnimationKeys[`${this.sprite}_${this.lastFacingDirection}`];
            if (currentAnimKey !== idleAnimKey) {
                this.idleAnimation();
            }
        }
    }

    public destroy() {
        if (this.teamGlow) {
            this.teamGlow.destroy();
        }
        this.uiContainer.destroy();
        super.destroy();
    }
}
