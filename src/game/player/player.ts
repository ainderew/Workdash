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

interface ServerSnapshot {
    x: number;
    y: number;
    vx: number;
    vy: number;
    timestamp: number;
    localReceiveTime: number;
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

    private serverSnapshots: ServerSnapshot[] = [];
    private readonly MAX_SNAPSHOTS = 20;

    public availabilityStatus: AvailabilityStatus = AvailabilityStatus.ONLINE;
    private statusCircle: Phaser.GameObjects.Graphics;

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

    moveSpeed: number;
    private baseMoveSpeed: number = 600;
    private kartSpeedMultiplier: number = 1.5;
    isLocal: boolean = true;
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

    private interpolationDelayMs: number = 80;
    private serverTimeOffset: number = 0;
    private lastServerTimestamp: number = 0;

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
        this.setDepth(10);

        if (customization) {
            this.changeSprite(customization);
        } else {
            this.idleAnimation();
        }

        this.setupUiEventListener();
    }

    public addServerSnapshot(snapshot: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        timestamp?: number;
    }) {
        const localNow = Date.now();
        const serverTimestamp = snapshot.timestamp || localNow;

        if (serverTimestamp > this.lastServerTimestamp) {
            const estimatedOneWayLatency = 25;
            this.serverTimeOffset =
                localNow - serverTimestamp - estimatedOneWayLatency;
            this.lastServerTimestamp = serverTimestamp;
        }

        const serverSnapshot: ServerSnapshot = {
            x: snapshot.x,
            y: snapshot.y,
            vx: snapshot.vx,
            vy: snapshot.vy,
            timestamp: serverTimestamp,
            localReceiveTime: localNow,
        };

        this.insertSnapshot(serverSnapshot);

        const dist = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            snapshot.x,
            snapshot.y,
        );
        if (dist > 400) {
            this.x = snapshot.x;
            this.y = snapshot.y;
            this.serverSnapshots = [serverSnapshot];
        }
    }

    private insertSnapshot(snapshot: ServerSnapshot) {
        if (this.serverSnapshots.length > 0) {
            const lastSnapshot = this.serverSnapshots[this.serverSnapshots.length - 1];
            const gap = snapshot.timestamp - lastSnapshot.timestamp;
            if (gap > 70) {
                 console.warn(`[Player Packet Gap] ${gap}ms for player ${this.id} (Expected ~50ms)`);
            }
        }

        let insertIndex = this.serverSnapshots.length;
        for (let i = this.serverSnapshots.length - 1; i >= 0; i--) {
            if (this.serverSnapshots[i].timestamp <= snapshot.timestamp) {
                insertIndex = i + 1;
                break;
            }
            if (i === 0) {
                insertIndex = 0;
            }
        }

        this.serverSnapshots.splice(insertIndex, 0, snapshot);

        while (this.serverSnapshots.length > this.MAX_SNAPSHOTS) {
            this.serverSnapshots.shift();
        }
    }

    public setNetworkConditions(pingMs: number) {
        const oneWayLatency = pingMs / 2;
        const jitterBuffer = 15;
        this.interpolationDelayMs = Math.max(
            50,
            oneWayLatency + jitterBuffer + 30,
        );
    }

    public changePlayerAvailabilityStatus(status: AvailabilityStatus) {
        this.availabilityStatus = status;
        if (this.statusCircle) {
            this.updateStatusCircle();
        }
    }

    public showReactionTag(data: ReactionData) {
        if (!data.reaction) {
            return;
        }

        if (data.playerId && data.playerId !== this.id) {
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

            this.teamGlow.setTintFill(glowColor);
            this.teamGlow.setAlpha(0.6);
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
                return;
            }

            animManager.createCharacterAnimations(characterKey, spritesheetKey);
            animManager.updateAnimationKeys(characterKey);

            this.sprite = characterKey;
            this.setTexture(spritesheetKey);
            this.setFrame(0);
            this.idleAnimation();

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

        this.uiContainer.setPosition(this.x, this.y - 40);

        if (this.isGhosted || this.isSpectator) {
            this.setAlpha(this.isGhosted ? 0.4 : 0.5);
            if (this.isGhosted) {
                this.setTint(0x000000);
            } else {
                this.clearTint();
            }
        } else {
            this.setAlpha(1.0);
            this.clearTint();
        }

        if (this.teamGlow && this.team) {
            this.teamGlow.setPosition(this.x, this.y);
            this.teamGlow.setFrame(this.frame.name);
            this.teamGlow.setFlipX(this.flipX);
            this.teamGlow.setDepth(this.depth - 1);
            this.teamGlow.setScale(this.scaleX * 1.15, this.scaleY * 1.15);
        }
    }

    private updateInput() {
        const isCommandPaletteOpen = useUiStore.getState().isCommandPaletteOpen;
        if (isCommandPaletteOpen) {
            this.setVelocity(0, 0);
            return;
        }

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

        if (this.serverSnapshots.length === 0) {
            return;
        }

        if (this.serverSnapshots.length < 3) {
             console.warn(`[Player Buffer Warning] Low snapshot count for ${this.id}: ${this.serverSnapshots.length}`);
        }

        const localNow = Date.now();
        const renderTime = localNow - this.interpolationDelayMs;
        const { before, after } = this.findBracketingSnapshots(renderTime);

        let targetX = this.x;
        let targetY = this.y;
        let currentVx = 0;
        let currentVy = 0;

        if (before && after && before !== after) {
            const beforeTime = before.timestamp + this.serverTimeOffset;
            const afterTime = after.timestamp + this.serverTimeOffset;
            const totalTime = afterTime - beforeTime;

            if (totalTime > 0) {
                const t = Math.min(
                    1,
                    Math.max(0, (renderTime - beforeTime) / totalTime),
                );
                targetX = before.x + (after.x - before.x) * t;
                targetY = before.y + (after.y - before.y) * t;
                currentVx = before.vx + (after.vx - before.vx) * t;
                currentVy = before.vy + (after.vy - before.vy) * t;
            } else {
                targetX = after.x;
                targetY = after.y;
                currentVx = after.vx;
                currentVy = after.vy;
            }
        } else if (before) {
            const snapshotTime = before.timestamp + this.serverTimeOffset;
            const elapsed = Math.min((renderTime - snapshotTime) / 1000, 0.1);

            if (elapsed > 0) {
                targetX = before.x + before.vx * elapsed;
                targetY = before.y + before.vy * elapsed;
            } else {
                targetX = before.x;
                targetY = before.y;
            }
            currentVx = before.vx;
            currentVy = before.vy;
        } else if (after) {
            targetX = after.x;
            targetY = after.y;
            currentVx = after.vx;
            currentVy = after.vy;
        }

        const distance = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            targetX,
            targetY,
        );

        if (distance > 300) {
            this.x = targetX;
            this.y = targetY;
        } else if (distance > 0.5) {
            const smoothing = Math.min(0.25, distance / 150);
            this.x += (targetX - this.x) * smoothing;
            this.y += (targetY - this.y) * smoothing;
        }

        if (this.body) {
            this.body.updateFromGameObject();
        }

        this.updateAnimationFromVelocity(currentVx, currentVy);
        this.cleanOldSnapshots(renderTime);
    }

    private cleanOldSnapshots(renderTime: number) {
        const keepTime = renderTime - 500;

        while (
            this.serverSnapshots.length > 2 &&
            this.serverSnapshots[0].timestamp + this.serverTimeOffset < keepTime
        ) {
            this.serverSnapshots.shift();
        }
    }

    private findBracketingSnapshots(renderTime: number): {
        before: ServerSnapshot | null;
        after: ServerSnapshot | null;
    } {
        let before: ServerSnapshot | null = null;
        let after: ServerSnapshot | null = null;

        for (let i = 0; i < this.serverSnapshots.length; i++) {
            const snap = this.serverSnapshots[i];
            const adjustedTimestamp = snap.timestamp + this.serverTimeOffset;

            if (adjustedTimestamp <= renderTime) {
                before = snap;
            } else {
                after = snap;
                break;
            }
        }

        return { before, after };
    }

    private updateAnimationFromVelocity(vx: number, vy: number) {
        const isMoving = Math.abs(vx) > 10 || Math.abs(vy) > 10;
        const currentAnimKey = this.anims.currentAnim?.key;

        if (isMoving) {
            this.setFlipX(false);

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

    public clearSnapshots() {
        this.serverSnapshots = [];
    }

    public destroy() {
        if (this.teamGlow) {
            this.teamGlow.destroy();
        }
        this.uiContainer.destroy();
        super.destroy();
    }
}
