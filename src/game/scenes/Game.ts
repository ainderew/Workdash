import { Scene } from "phaser";
import { Player } from "../player/player";
import { Multiplayer } from "../multiplayer/multiplayer";
import {
    AttackAnimationKeys,
    IdleAnimationKeys,
    SpriteKeys,
    WalkAnimationKeys,
} from "../commmon/enums";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "../player/_enums";
import { CharacterCustomization } from "../character/_types";
import { CharacterCompositor } from "../character/CharacterCompositor";
import { CharacterAnimationManager } from "../character/CharacterAnimationManager";

export class Game extends Scene {
    //Game setup
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    inputElement: HTMLInputElement;

    // Players
    localPlayerId: string;
    players: Map<string, Player>;

    // FIX: Track players currently loading to prevent duplicate spawns during async waits
    loadingPlayers: Set<string> = new Set();

    playersLayer: Phaser.Physics.Arcade.Group;

    // Multiplayer Logic
    multiplayer;
    lastTick: number = 0;
    Hz: number = 1000 / 30; // 20hz

    constructor() {
        super("Game");
        this.players = new Map();
    }

    create() {
        // Get JWT from window global (set by React wrapper)
        const jwtToken = this.getJwtToken();

        if (!jwtToken) {
            console.error(
                "JWT token is missing! Cannot connect to multiplayer server.",
            );
        } else {
            console.log("JWT token found, connecting to multiplayer...");
        }

        this.multiplayer = new Multiplayer(jwtToken);
        this.multiplayer.connectToserver();

        const map = this.make.tilemap({
            key: "map",
            tileWidth: 32,
            tileHeight: 32,
        });

        /**
         * fixedStep - removed jitter because of name container
         * do not set to true
         */
        this.physics.world.fixedStep = false;
        this.physics.world.setBounds(0, 0, 4064, 3200);

        // Camera setup
        // this.cameras.main.setBounds(0, 0, 4064, 3200);

        const interiorTilesets = [];

        const exterior_tileset = map.addTilesetImage("Exterior", "Exterior")!;
        const Interior_2 = map.addTilesetImage("Interior_2", "Interior_2")!;
        for (let i = 0; i < 9; i++) {
            interiorTilesets.push(
                map.addTilesetImage(
                    `Interior_Tile_${i}`,
                    `Interior_Tile_${i}`,
                )!,
            );
        }

        // Include all tilesets in your layers
        const allTilesets = [exterior_tileset, Interior_2, ...interiorTilesets];

        if (!Interior_2) {
            alert("INTERIOR DOES NOT EXIST");
            throw new Error("Tileset 'tiles_1' not found!");
        }

        /**
         * Don't touch the order it will mess with rendering
         */
        const floorLayer = map.createLayer("Floor", allTilesets, 0, 0)!;
        const rugLayer = map.createLayer("Rugs", allTilesets, 0, 0)!;
        const wallLayer = map.createLayer("Wall", allTilesets, 0, 0)!;
        const wDecorationLayer = map.createLayer(
            "WallDecoration",
            allTilesets,
            0,
            0,
        )!;
        const furnitureLayer = map.createLayer("Furniture", allTilesets, 0, 0)!;
        const fDecorationLayer = map.createLayer(
            "FurnitureDecoration",
            allTilesets,
            0,
            0,
        )!;
        const buildingsLayer = map.createLayer("Buildings", allTilesets, 0, 0)!;
        const trees2Layer = map.createLayer("Trees2", allTilesets, 0, 0)!;
        const treesLayer = map.createLayer("Trees", allTilesets, 0, 0)!;

        // treesLayer.setDepth(20);
        // wallLayer.setDepth(10);

        this.multiplayer.watchNewPlayers(
            this.createPlayer.bind(this),
            this.destroyPlayer.bind(this),
        );
        this.multiplayer.watchPlayerMovement(this.players);

        // Explicitly join the game to spawn the character
        // We spawn at a default location (e.g., 800, 800) or load from DB
        this.multiplayer.joinGame(800, 800);

        this.startAnimation();
        this.initializeCollisions(
            wallLayer,
            floorLayer,
            furnitureLayer,
            fDecorationLayer,
            wDecorationLayer,
            rugLayer,
            buildingsLayer,
            trees2Layer,
            treesLayer,
        );

        this.setupChatBlur();
    }

    // FIX: Added 'async' keyword here so 'await' can be used inside
    public async createPlayer(
        id: string,
        name: string | undefined,
        x: number,
        y: number,
        availabilityStatus: AvailabilityStatus = AvailabilityStatus.ONLINE,
        customization: CharacterCustomization | null,
        opts: { isLocal: boolean },
    ): Promise<void> {
        // FIX: Check if player exists OR is currently loading to prevent race conditions
        if (this.players.has(id) || this.loadingPlayers.has(id)) {
            return;
        }

        this.loadingPlayers.add(id);
        console.log("Creating player:", id, name);

        try {
            let spriteKey: string;

            if (customization) {
                // Create custom character
                const characterKey = `custom-${id}`;
                const spritesheetKey = `${characterKey}-spritesheet`;

                const compositor = new CharacterCompositor(this);
                const animManager = new CharacterAnimationManager(this);

                try {
                    // FIX: await ensures texture is ready before we try to use it
                    await compositor.createAnimatedSpritesheet(
                        customization,
                        spritesheetKey,
                    );

                    // Double check texture exists
                    if (this.textures.exists(spritesheetKey)) {
                        animManager.createCharacterAnimations(
                            characterKey,
                            spritesheetKey,
                        );
                        animManager.updateAnimationKeys(characterKey);
                        spriteKey = characterKey;
                    } else {
                        console.warn(
                            `Texture ${spritesheetKey} missing after creation, using default`,
                        );
                        spriteKey = SpriteKeys.ADAM;
                        customization = null;
                    }
                } catch (error) {
                    console.error(
                        "Error creating custom character texture:",
                        error,
                    );
                    spriteKey = SpriteKeys.ADAM;
                    customization = null;
                }
            } else {
                // Fallback to default sprite
                spriteKey = SpriteKeys.ADAM;
            }

            // Final check to ensure player wasn't added by another event while we were awaiting
            if (this.players.has(id)) return;

            const playerInstance = new Player(
                this,
                name,
                id,
                x,
                y,
                availabilityStatus,
                spriteKey,
                // Pass customization if we want Player to store it,
                // but if we already loaded the texture, Player doesn't need to re-run changeSprite immediately.
                customization,
                {
                    isLocal: opts.isLocal,
                },
            );

            usePlayersStore
                .getState()
                .addPlayerToMap(id, playerInstance as Player);
            this.players.set(id, playerInstance);
            this.playersLayer.add(playerInstance);

            if (opts.isLocal) {
                this.setupLocalPlayer(playerInstance);
            }
        } finally {
            // Always remove from loading set, even if error occurred
            this.loadingPlayers.delete(id);
        }
    }

    private setupLocalPlayer(localPlayer: Player): void {
        this.localPlayerId = localPlayer.id;
        this.cameras.main.startFollow(localPlayer, true, 0.1, 0.1);
        usePlayersStore.getState().setLocalPlayerId(localPlayer.id);
    }

    public destroyPlayer(id: string): void {
        const p = this.players.get(id);
        if (p) {
            p.destroy();
            this.players.delete(id);
        }
        this.loadingPlayers.delete(id);
    }

    /**
     * Update loop
     * removed delta for not for unused variables
     * public update(time: number, delta: number)
     */
    public update(time: number) {
        const tickRate = time - this.lastTick > this.Hz;

        for (const p of this.players.values()) {
            p.update();

            if (p.isLocal && tickRate) {
                this.multiplayer.emitPlayerMovement({
                    x: p.x,
                    y: p.y,
                    isAttacking: p.isAttacking,
                    vx: p.vx,
                    vy: p.vy,
                    id: this.localPlayerId,
                    opts: { isLocal: true },
                });

                this.lastTick = time;
            }
        }
    }

    private startAnimation() {
        this.anims.create({
            key: AttackAnimationKeys.ADAM,
            frames: this.anims.generateFrameNumbers(SpriteKeys.ADAM_ATTACK, {
                start: 0,
                end: 8,
            }),
            frameRate: 6,
            repeat: 0,
        });

        this.anims.create({
            key: WalkAnimationKeys.ADAM,
            frames: this.anims.generateFrameNumbers(SpriteKeys.ADAM_WALK, {
                start: 0,
                end: 5,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: WalkAnimationKeys.ADAM_UP,
            frames: this.anims.generateFrameNumbers(SpriteKeys.ADAM_WALK, {
                start: 6,
                end: 11,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: WalkAnimationKeys.ADAM_DOWN,
            frames: this.anims.generateFrameNumbers(SpriteKeys.ADAM_WALK, {
                start: 18,
                end: 23,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: IdleAnimationKeys.ADAM,
            frames: this.anims.generateFrameNumbers(SpriteKeys.ADAM, {
                start: 18,
                end: 23,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: AttackAnimationKeys.SOLDIER,
            frames: this.anims.generateFrameNumbers(SpriteKeys.SOLDIER_ATTACK, {
                start: 0,
                end: 5,
            }),
            frameRate: 6,
            repeat: 0,
        });

        this.anims.create({
            key: WalkAnimationKeys.SOLDIER,
            frames: this.anims.generateFrameNumbers(SpriteKeys.SOLDIER_WALK, {
                start: 0,
                end: 5,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: IdleAnimationKeys.SOLDIER,
            frames: this.anims.generateFrameNumbers(SpriteKeys.SOLDIER, {
                start: 0,
                end: 5,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: IdleAnimationKeys.ORC,
            frames: this.anims.generateFrameNumbers(SpriteKeys.ORC, {
                start: 0,
                end: 5,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: WalkAnimationKeys.ORC,
            frames: this.anims.generateFrameNumbers(SpriteKeys.ORC_WALK, {
                start: 0,
                end: 5,
            }),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: AttackAnimationKeys.ORC,
            frames: this.anims.generateFrameNumbers(AttackAnimationKeys.ORC, {
                start: 0,
                end: 5,
            }),
            frameRate: 6,
            repeat: 0,
        });
    }

    private initializeCollisions(
        wallLayer: Phaser.Tilemaps.TilemapLayer,
        floorLayer: Phaser.Tilemaps.TilemapLayer,
        furnitureLayer: Phaser.Tilemaps.TilemapLayer,
        fDecorationLayer: Phaser.Tilemaps.TilemapLayer,
        wDecorationLayer: Phaser.Tilemaps.TilemapLayer,
        rugLayer: Phaser.Tilemaps.TilemapLayer,
        buildingsLayer: Phaser.Tilemaps.TilemapLayer,
        trees2Layer: Phaser.Tilemaps.TilemapLayer,
        treesLayer: Phaser.Tilemaps.TilemapLayer,
    ): void {
        // TODO: organize initialization code
        this.playersLayer = this.physics.add.group();
        this.physics.add.collider(this.playersLayer, wallLayer);
        this.physics.add.collider(this.playersLayer, furnitureLayer);
        this.physics.add.collider(this.playersLayer, treesLayer);
        this.physics.add.collider(this.playersLayer, trees2Layer);

        wallLayer.setCollisionBetween(0, 100000, true);
        furnitureLayer.setCollisionBetween(0, 200000, true);
        treesLayer.setCollisionBetween(0, 9500, true);
        trees2Layer.setCollisionBetween(0, 9500, true);

        this.playersLayer.runChildUpdate = true;
        console.log(
            floorLayer,
            furnitureLayer,
            fDecorationLayer,
            wDecorationLayer,
            rugLayer,
            buildingsLayer,
            trees2Layer,
            treesLayer,
        );

        // Turned off collisions between players for now
        // It makes it harder to move around
        // this.physics.add.collider(this.playersLayer, this.playersLayer);
    }

    private setupChatBlur() {
        this.input.on("pointerdown", () => {
            const active = document.activeElement as HTMLElement | null;

            if (!active) return;

            const tag = active.tagName?.toLowerCase();
            const isEditable =
                tag === "input" ||
                tag === "textarea" ||
                active.isContentEditable;

            if (isEditable) {
                active.blur();
            }
        });
    }

    private getJwtToken(): string {
        // Get JWT token from window global (set by React wrapper)
        return (window as any).__BACKEND_JWT__ || "";
    }
}
