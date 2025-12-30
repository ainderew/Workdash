import usePlayersStore from "@/common/store/playerStore";
import { BaseGameScene } from "./BaseGameScene";
import { Player } from "../player/player";

export class SoccerMap extends BaseGameScene {
    mapKey = "soccer_map";
    worldBounds = { width: 3520, height: 1600 };

    constructor() {
        super("SoccerMap");
    }

    create() {
        super.create();
        this.time.delayedCall(1000, () => {
            this.centerCamera();
        });
    }

    protected setupAudio() {}
    protected setupLocalPlayer(localPlayer: Player): void {
        this.localPlayerId = localPlayer.id;
        usePlayersStore.getState().setLocalPlayerId(localPlayer.id);

        localPlayer.setPosition(this.spawnX, this.spawnY);
        localPlayer.setScale(2.5);
        localPlayer.setVisible(true);
        localPlayer.setActive(true);
    }

    protected setupCamera() {
        // Override to do nothing - we'll set up in centerCamera
    }

    protected setupRemotePlayer(localPlayer: Player): void {
        // Scale up the player
        localPlayer.setScale(2.5);
        localPlayer.destroyNameTag();
        localPlayer.moveSpeed = localPlayer.moveSpeed * 1.5;
    }

    private centerCamera() {
        const zoomX = this.scale.width / this.worldBounds.width;
        const zoomY = this.scale.height / this.worldBounds.height;
        const zoom = Math.min(zoomX, zoomY);

        const gameWidth = this.worldBounds.width * zoom;
        const gameHeight = this.worldBounds.height * zoom;

        const offsetX = (this.scale.width - gameWidth) / 2;
        const offsetY = (this.scale.height - gameHeight) / 2;

        this.cameras.main.setViewport(offsetX, offsetY, gameWidth, gameHeight);
        this.cameras.main.setZoom(zoom);
        this.cameras.main.stopFollow();
        this.cameras.main.setScroll(0, 0);
    }
    protected createLayers(
        map: Phaser.Tilemaps.Tilemap,
    ): Map<string, Phaser.Tilemaps.TilemapLayer> {
        const layers = new Map<string, Phaser.Tilemaps.TilemapLayer>();

        console.log("Map loaded:", map);
        console.log("Map dimensions:", map.widthInPixels, map.heightInPixels);

        const soccerTileset = map.addTilesetImage("soccer", "soccer");
        const goalTileset = map.addTilesetImage("goal", "goal");
        const goal2Tileset = map.addTilesetImage("goal_2", "goal_2");
        const circleTileset = map.addTilesetImage("circle", "circle");

        console.log(
            "Tilesets:",
            goalTileset,
            goal2Tileset,
            circleTileset,
            soccerTileset,
        );

        if (!goalTileset || !goal2Tileset || !circleTileset || !soccerTileset) {
            console.error("One or more tilesets failed to load!");
        }

        const allTilesets = [
            goalTileset!,
            goal2Tileset!,
            circleTileset!,
            soccerTileset!,
        ];

        const floorMarkingsLayer = map.createLayer(
            "FloorMarkings",
            allTilesets,
            0,
            0,
        );
        const goalsLayer = map.createLayer("goals", allTilesets, 0, 0);
        const circleLayer = map.createLayer("circle", allTilesets, 0, 0);

        console.log("Layers created:", goalsLayer, circleLayer);

        if (circleLayer) layers.set("Circle_Layer", circleLayer);
        if (goalsLayer) layers.set("Goal_Layer", goalsLayer);
        if (floorMarkingsLayer)
            layers.set("Floor_Markings_Layer", floorMarkingsLayer);
        return layers;
    }
    protected setupCollisions(
        layers: Map<string, Phaser.Tilemaps.TilemapLayer>,
    ): void {
        const floorMarkingLayer = layers.get("Floor_Markings_Layer")!;
        this.physics.add.collider(this.playersLayer, floorMarkingLayer);
        floorMarkingLayer.setCollisionBetween(0, 100000, true);
        this.setupDoorCollisions();
    }

    protected createAnimatedObjects(_map: Phaser.Tilemaps.Tilemap) {
        void _map;
    }

    protected createDoors(_map: Phaser.Tilemaps.Tilemap) {
        this.doors = [];
        void _map;
    }
}
