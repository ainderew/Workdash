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
import useUserStore from "@/common/store/useStore";
import { EventBus } from "../EventBus";
import { AudioZoneManager } from "../audioZoneManager/audioZoneManager";
import { BackgroundMusicManager } from "../audio/BackgroundMusicManager";
import { TeleportManager } from "../managers/TeleportManager";

export interface SceneData {
    spawnX?: number;
    spawnY?: number;
}

export abstract class BaseGameScene extends Scene {
    map: Phaser.Tilemaps.Tilemap;
    camera: Phaser.Cameras.Scene2D.Camera;
    currentZoom: number = 1;

    localPlayerId: string;
    players: Map<string, Player> = new Map();
    loadingPlayers: Set<string> = new Set();
    playersLayer: Phaser.Physics.Arcade.Group;
    doors: Phaser.GameObjects.GameObject[] = [];

    multiplayer: Multiplayer;
    lastTick: number = 0;
    Hz: number = 1000 / 50;
    private wasAttacking: boolean = false;

    protected audioZoneManager: AudioZoneManager;
    protected backgroundMusicManager: BackgroundMusicManager;
    protected teleportManager: TeleportManager;

    protected spawnX: number = 1000;
    protected spawnY: number = 1000;
    protected currentSceneName: string;

    abstract mapKey: string;
    abstract worldBounds: { width: number; height: number };

    init(data: SceneData) {
        this.spawnX = data.spawnX ?? this.spawnX;
        this.spawnY = data.spawnY ?? this.spawnY;
        this.players = new Map();
        this.loadingPlayers = new Set();
    }

    create() {
        // Set current scene name
        this.currentSceneName = this.scene.key;

        this.setupCamera();
        this.setupMultiplayer();
        this.createAnimations();

        const map = this.loadMap();
        const layers = this.createLayers(map);

        this.setupPhysicsWorld();
        this.createAnimatedObjects(map);
        this.createDoors(map);

        this.playersLayer = this.physics.add.group({ runChildUpdate: true });

        this.setupCollisions(layers);
        this.setupTeleports(map);
        this.setupAudio(map);
        this.setupMultiplayerWatchers();
        this.setupChatBlur();

        EventBus.on("teleport", this.handleTeleportCommand, this);

        // Join game with scene name
        this.multiplayer.joinGame(
            this.spawnX,
            this.spawnY,
            this.currentSceneName,
        );
        this.multiplayer.setCurrentScene(this.currentSceneName);

        EventBus.emit("current-scene-ready", this);
        this.cameras.main.fadeIn(300); // Add this
    }

    protected setupCamera() {
        this.cameras.main.setZoom(this.currentZoom);
        this.input.on(
            "wheel",
            (
                _pointer: Phaser.Input.Pointer,
                _gameObjects: Phaser.GameObjects.GameObject[],
                _deltaX: number,
                deltaY: number,
            ) => {
                const delta = deltaY > 0 ? -1 : 1;
                this.currentZoom = Phaser.Math.Clamp(
                    this.currentZoom + delta,
                    1,
                    4,
                );
                this.cameras.main.setZoom(this.currentZoom);
            },
        );
    }

    protected setupMultiplayer() {
        const jwtToken = this.getJwtToken();

        // Reuse existing multiplayer connection if it exists and is connected
        if (window.__MULTIPLAYER__?.socket?.connected) {
            this.multiplayer = window.__MULTIPLAYER__;
            console.log("Reusing existing multiplayer connection");
        } else {
            if (!jwtToken) {
                console.error(
                    "JWT token is missing! Cannot connect to multiplayer server.",
                );
            }

            this.multiplayer = new Multiplayer(jwtToken);
            this.multiplayer.connectToserver();
            window.__MULTIPLAYER__ = this.multiplayer;
            console.log("Created new multiplayer connection");
        }
    }

    protected setupPhysicsWorld(map?: Phaser.Tilemaps.Tilemap) {
        this.physics.world.fixedStep = false;

        if (map) {
            this.physics.world.setBounds(
                0,
                0,
                map.widthInPixels,
                map.heightInPixels,
            );
            this.cameras.main.setBounds(
                0,
                0,
                map.widthInPixels,
                map.heightInPixels,
            );
        } else {
            this.physics.world.setBounds(
                0,
                0,
                this.worldBounds.width,
                this.worldBounds.height,
            );
            this.cameras.main.setBounds(
                0,
                0,
                this.worldBounds.width,
                this.worldBounds.height,
            );
        }
    }
    protected loadMap(): Phaser.Tilemaps.Tilemap {
        this.map = this.make.tilemap({
            key: this.mapKey,
            tileWidth: 32,
            tileHeight: 32,
        });
        return this.map;
    }

    protected abstract createLayers(
        map: Phaser.Tilemaps.Tilemap,
    ): Map<string, Phaser.Tilemaps.TilemapLayer>;
    protected abstract setupCollisions(
        layers: Map<string, Phaser.Tilemaps.TilemapLayer>,
    ): void;

    protected createAnimatedObjects(map: Phaser.Tilemaps.Tilemap) {
        const animatedObjectConfigs = [
            {
                name: "fish_tank",
                key: "Animated_Fish_Tank",
                anim: "fish_tank_anim",
                layer: "Doors",
            },
            {
                name: "coffee",
                key: "Animated_Coffee",
                anim: "coffee_anim",
                layer: "Doors",
            },
            {
                name: "control_panel",
                key: "Animated_Control_Panel",
                anim: "control_panel_anim",
                layer: "Doors",
            },
            {
                name: "server",
                key: "Animated_Server",
                anim: "server_anim",
                layer: "Doors",
            },
            {
                name: "christmas_lights",
                key: "Animated_Christmas_Lights",
                anim: "christmas_lights",
                layer: "Doors",
            },
            {
                name: "clock",
                key: "Animated_Clock",
                anim: "clock_anim",
                layer: "Doors",
            },
        ];

        animatedObjectConfigs.forEach((config) => {
            const objects = map.createFromObjects(config.layer, {
                name: config.name,
                key: config.key,
                frame: 0,
                classType: Phaser.GameObjects.Sprite,
            });

            objects.forEach((obj) => {
                const sprite = obj as Phaser.GameObjects.Sprite;
                sprite.setDepth(100);
                sprite.play(config.anim);
            });
        });

        const fountainObjects = map.createFromObjects("AnimatedTiles", {
            name: "outside_fountain",
            key: "Animated_Fountain",
            frame: 0,
            classType: Phaser.GameObjects.Sprite,
        });

        this.physics.world.enable(fountainObjects);
        fountainObjects.forEach((obj) => {
            const sprite = obj as Phaser.GameObjects.Sprite;
            sprite.setDepth(100);
            sprite.play("fountain_anim");

            const body = sprite.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.setImmovable(true);
                body.setSize(96, 192);
                body.setOffset(0, 0);
            }
        });
    }

    protected createDoors(map: Phaser.Tilemaps.Tilemap) {
        this.doors = map.createFromObjects("Doors", {
            name: "door1",
            key: "Sliding_Door",
            frame: 0,
            classType: Phaser.GameObjects.Sprite,
        });

        this.physics.world.enable(this.doors);
        this.doors.forEach((object) => {
            const door = object as Phaser.GameObjects.Sprite;
            door.setDepth(100);
            door.setData("isOpen", false);

            const body = door.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.setImmovable(true);
                body.setSize(64, 64);
                body.setOffset(0, 0);
            }
        });
    }

    protected setupTeleports(map: Phaser.Tilemaps.Tilemap) {
        this.teleportManager = new TeleportManager(this);
        this.teleportManager
            .createFromObjectLayer(map, "GameZones")
            .setupCollision(this.playersLayer);
    }

    protected setupAudio(map: Phaser.Tilemaps.Tilemap) {
        this.audioZoneManager = new AudioZoneManager(this);
        this.audioZoneManager.initializeZones(map, this.playersLayer);

        if (this.sound && "pauseOnBlur" in this.sound) {
            this.sound.pauseOnBlur = false;
        }

        this.backgroundMusicManager = new BackgroundMusicManager(this);
        this.backgroundMusicManager.initialize();
    }

    protected setupMultiplayerWatchers() {
        this.multiplayer.watchNewPlayers(
            this.createPlayer.bind(this),
            this.destroyPlayer.bind(this),
            this.players,
        );
        this.multiplayer.watchPlayerMovement(this.players);
        this.multiplayer.watchCharacterUpdates(this.players);
        this.multiplayer.watchNameUpdates(this.players);
        this.multiplayer.watchPlayerActions(this.players);
    }

    protected setupDoorCollisions() {
        this.physics.add.overlap(this.playersLayer, this.doors, (door) => {
            const doorSprite = door as Phaser.GameObjects.Sprite;
            if (!doorSprite.getData("isOpen")) {
                doorSprite.setData("isOpen", true);
                doorSprite.play("door_open");
                this.sound.play("door_open");
            }
            doorSprite.setData("touchedThisFrame", true);
        });
    }

    protected createAnimations() {
        this.anims.create({
            key: "door_open",
            frames: this.anims.generateFrameNumbers("Sliding_Door", {
                start: 0,
                end: 6,
            }),
            frameRate: 15,
            repeat: 0,
        });

        this.anims.create({
            key: "door_close",
            frames: this.anims.generateFrameNumbers("Sliding_Door", {
                start: 7,
                end: 13,
            }),
            frameRate: 15,
            repeat: 0,
        });

        const objectAnimations = [
            {
                key: "coffee_anim",
                texture: "Animated_Coffee",
                start: 0,
                end: 4,
                frameRate: 5,
            },
            {
                key: "control_panel_anim",
                texture: "Animated_Control_Panel",
                start: 0,
                end: 9,
                frameRate: 10,
            },
            {
                key: "fish_tank_anim",
                texture: "Animated_Fish_Tank",
                start: 0,
                end: 6,
                frameRate: 7,
            },
            {
                key: "server_anim",
                texture: "Animated_Server",
                start: 0,
                end: 2,
                frameRate: 3,
            },
            {
                key: "christmas_lights",
                texture: "Animated_Christmas_Lights",
                start: 0,
                end: 5,
                frameRate: 5,
            },
            {
                key: "clock_anim",
                texture: "Animated_Clock",
                start: 0,
                end: 9,
                frameRate: 10,
            },
            {
                key: "fountain_anim",
                texture: "Animated_Fountain",
                start: 0,
                end: 5,
                frameRate: 6,
            },
        ];

        objectAnimations.forEach(({ key, texture, start, end, frameRate }) => {
            this.anims.create({
                key,
                frames: this.anims.generateFrameNumbers(texture, {
                    start,
                    end,
                }),
                frameRate,
                repeat: -1,
            });
        });

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

    public async createPlayer(
        id: string,
        name: string | undefined,
        x: number,
        y: number,
        availabilityStatus: AvailabilityStatus = AvailabilityStatus.ONLINE,
        customization: CharacterCustomization | null,
        opts: { isLocal: boolean },
    ): Promise<void> {
        if (!this.scene || !this.physics || !this.playersLayer) {
            console.warn(
                "[createPlayer] Scene not ready, skipping player creation",
            );
            return;
        }

        if (this.players.has(id) || this.loadingPlayers.has(id)) {
            return;
        }

        this.loadingPlayers.add(id);

        try {
            let spriteKey: string;

            if (customization) {
                const characterKey = `custom-${id}`;
                const spritesheetKey = `${characterKey}-spritesheet`;

                const compositor = new CharacterCompositor(this);
                const animManager = new CharacterAnimationManager(this);

                try {
                    animManager.removeCharacterAnimations(characterKey);
                    await compositor.createAnimatedSpritesheet(
                        customization,
                        spritesheetKey,
                        opts.isLocal,
                    );

                    if (this.textures.exists(spritesheetKey)) {
                        animManager.createCharacterAnimations(
                            characterKey,
                            spritesheetKey,
                        );
                        animManager.updateAnimationKeys(characterKey);
                        spriteKey = characterKey;
                    } else {
                        spriteKey = SpriteKeys.ADAM;
                        customization = null;
                    }
                } catch {
                    spriteKey = SpriteKeys.ADAM;
                    customization = null;
                }
            } else {
                spriteKey = SpriteKeys.ADAM;
            }

            if (this.players.has(id)) return;

            const playerInstance = new Player(
                this,
                name,
                id,
                x,
                y,
                availabilityStatus,
                spriteKey,
                customization,
                { isLocal: opts.isLocal },
            );

            usePlayersStore
                .getState()
                .addPlayerToMap(id, playerInstance as Player);
            this.players.set(id, playerInstance);
            this.playersLayer.add(playerInstance);
            this.setupRemotePlayer(playerInstance);

            if (opts.isLocal) {
                this.setupLocalPlayer(playerInstance);
                const state = useUserStore.getState();
                state.setCharacterCustomization(customization!);

                // If in SoccerMap, pass soccer stats to the player instance
                if (this.currentSceneName === "SoccerMap") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const soccerStore = (this as any).soccerStats;
                    if (soccerStore) {
                        playerInstance.soccerStats = soccerStore;
                    }
                }
                console.log("loaded local");
            }
        } finally {
            console.log("CREATING" + name);
            console.log(opts);

            this.loadingPlayers.delete(id);
        }
    }

    protected setupLocalPlayer(localPlayer: Player): void {
        this.localPlayerId = localPlayer.id;
        this.cameras.main.startFollow(localPlayer, true, 0.1, 0.1);
        usePlayersStore.getState().setLocalPlayerId(localPlayer.id);
    }

    protected setupRemotePlayer(remotePlayer: Player) {
        //for soccer
        console.log(remotePlayer);
    }

    public destroyPlayer(id: string): void {
        const p = this.players.get(id);
        if (p) {
            p.destroy();
            this.players.delete(id);
        }
        this.loadingPlayers.delete(id);
    }

     
    update(time: number, _delta: number) {
        if (!this.players) return;

        const tickRate = time - this.lastTick > this.Hz;

        for (const p of this.players.values()) {
            p.update(time, _delta);

            if (p.isLocal) {
                if (p.isAttacking && !this.wasAttacking) {
                    this.multiplayer.emitPlayerAction("attack");
                    this.wasAttacking = true;
                } else if (!p.isAttacking) {
                    this.wasAttacking = false;
                }
            }

            if (p.isLocal && tickRate) {
                // Skip legacy movement updates in SoccerMap (handled by raw inputs)
                if (this.currentSceneName !== "SoccerMap") {
                    this.multiplayer.emitPlayerMovement({
                        x: Math.round(p.x),
                        y: Math.round(p.y),
                        isAttacking: p.isAttacking,
                        isKartMode: p.isKartMode,
                        vx: Math.round(p.physicsState.vx),
                        vy: Math.round(p.physicsState.vy),
                        id: this.localPlayerId,
                        opts: { isLocal: true },
                    });
                }
                this.lastTick = time;
            }
        }

        this.audioZoneManager?.checkZoneExits(this.players);

        for (const obj of this.doors) {
            const door = obj as Phaser.GameObjects.Sprite;

            if (door.getData("touchedThisFrame")) {
                door.setData("touchedThisFrame", false);
            } else if (door.getData("isOpen") && !door.anims.isPlaying) {
                door.setData("isOpen", false);
                door.play("door_close");
            }
        }
    }

    protected setupChatBlur() {
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

    protected getJwtToken(): string {
        return window.__BACKEND_JWT__ || "";
    }

    private handleTeleportCommand(data: {
        scene: string;
        x?: number;
        y?: number;
    }) {
        if (this.scene.key === data.scene) return;

        this.physics.pause();

        if (this.multiplayer) {
            this.multiplayer.emitSceneChange(
                data.scene,
                data.x || 1000,
                data.y || 1000,
            );
            this.multiplayer.removeAllGameListeners();
        }

        this.scene.start(data.scene, { spawnX: data.x, spawnY: data.y });
    }

    shutdown() {
        EventBus.off("teleport", this.handleTeleportCommand, this);
        this.multiplayer?.removeAllGameListeners();

        for (const player of this.players.values()) {
            player.destroy();
        }
        this.players.clear();
        this.loadingPlayers.clear();

        this.teleportManager?.destroy();
        this.audioZoneManager?.destroy?.();
        this.backgroundMusicManager?.destroy?.();
    }
}
