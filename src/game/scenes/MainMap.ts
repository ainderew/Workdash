import { BaseGameScene } from "./BaseGameScene";

export class MainMap extends BaseGameScene {
    mapKey = "map";
    worldBounds = { width: 4064, height: 3200 };

    constructor() {
        super("MainMap");
    }

    protected createLayers(
        map: Phaser.Tilemaps.Tilemap,
    ): Map<string, Phaser.Tilemaps.TilemapLayer> {
        const layers = new Map<string, Phaser.Tilemaps.TilemapLayer>();

        const interiorTilesets = [];
        const exterior_tileset = map.addTilesetImage("Exterior", "Exterior")!;
        const office_tileset = map.addTilesetImage("Office", "Office")!;
        const Interior_2 = map.addTilesetImage("Interior_2", "Interior_2")!;

        for (let i = 0; i < 9; i++) {
            interiorTilesets.push(
                map.addTilesetImage(
                    `Interior_Tile_${i}`,
                    `Interior_Tile_${i}`,
                )!,
            );
        }

        const allTilesets = [
            exterior_tileset,
            office_tileset,
            Interior_2,
            ...interiorTilesets,
        ];

        if (!Interior_2) {
            throw new Error("Tileset 'Interior_2' not found!");
        }

        layers.set("Floor", map.createLayer("Floor", allTilesets, 0, 0)!);
        layers.set("Rugs", map.createLayer("Rugs", allTilesets, 0, 0)!);
        layers.set("Wall", map.createLayer("Wall", allTilesets, 0, 0)!);
        layers.set(
            "WallDecoration",
            map.createLayer("WallDecoration", allTilesets, 0, 0)!,
        );
        layers.set(
            "Furniture",
            map.createLayer("Furniture", allTilesets, 0, 0)!,
        );
        layers.set(
            "FurnitureDecoration",
            map.createLayer("FurnitureDecoration", allTilesets, 0, 0)!,
        );
        layers.set(
            "Buildings",
            map.createLayer("Buildings", allTilesets, 0, 0)!,
        );
        layers.set("Trees2", map.createLayer("Trees2", allTilesets, 0, 0)!);
        layers.set("Trees", map.createLayer("Trees", allTilesets, 0, 0)!);

        return layers;
    }

    protected setupCollisions(
        layers: Map<string, Phaser.Tilemaps.TilemapLayer>,
    ): void {
        const wallLayer = layers.get("Wall")!;
        const furnitureLayer = layers.get("Furniture")!;
        const treesLayer = layers.get("Trees")!;
        const trees2Layer = layers.get("Trees2")!;

        this.physics.add.collider(this.playersLayer, wallLayer);
        this.physics.add.collider(this.playersLayer, furnitureLayer);
        this.physics.add.collider(this.playersLayer, treesLayer);
        this.physics.add.collider(this.playersLayer, trees2Layer);

        wallLayer.setCollisionBetween(0, 100000, true);
        furnitureLayer.setCollisionBetween(0, 200000, true);
        treesLayer.setCollisionBetween(0, 9500, true);
        trees2Layer.setCollisionBetween(0, 9500, true);

        this.setupDoorCollisions();
    }
}
