import { Player } from "../player/player";
import { BaseGameScene } from "../scenes/BaseGameScene";

export class TeleportManager {
    private scene: BaseGameScene;
    private teleportZones: Phaser.Physics.Arcade.StaticGroup;
    private isTransitioning: boolean = false;

    constructor(scene: BaseGameScene) {
        this.scene = scene;
        this.teleportZones = scene.physics.add.staticGroup();
    }

    createFromObjectLayer(map: Phaser.Tilemaps.Tilemap, layerName: string) {
        const objectLayer = map.getObjectLayer(layerName);
        if (!objectLayer) {
            console.warn(
                `[TeleportManager] Object layer "${layerName}" not found`,
            );
            return this;
        }
        objectLayer.objects.forEach((obj) => {
            if (!obj.width || !obj.height) {
                console.warn(
                    `[TeleportManager] Object "${obj.name}" has no dimensions, skipping`,
                );
                return;
            }
            const zone = this.teleportZones.create(
                obj.x! + obj.width / 2,
                obj.y! + obj.height / 2,
            ) as Phaser.Physics.Arcade.Sprite;
            zone.body?.setSize(obj.width, obj.height);
            zone.setVisible(false);
            zone.setData("targetScene", obj.name);
            if (obj.properties) {
                obj.properties.forEach(
                    (prop: { name: string; value: string }) => {
                        zone.setData(prop.name, prop.value);
                    },
                );
            }
        });
        return this;
    }

    setupCollision(playerGroup: Phaser.Physics.Arcade.Group) {
        this.scene.physics.add.overlap(
            playerGroup,
            this.teleportZones,
            this.handleTeleport,
            undefined,
            this,
        );
        return this;
    }

    private handleTeleport: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
        (player, zone) => {
            const playerInstance = player as Player;
            const zoneSprite = zone as Phaser.Physics.Arcade.Sprite;

            // Only teleport local player
            if (!playerInstance.isLocal) return;

            if (this.isTransitioning) return;
            this.isTransitioning = true;

            const targetScene = zoneSprite.getData("targetScene");
            const spawnX = parseInt(zoneSprite.getData("spawnX"));
            const spawnY = parseInt(zoneSprite.getData("spawnY"));

            this.transitionToScene(targetScene, spawnX, spawnY);
        };

    private transitionToScene(
        sceneKey: string,
        spawnX?: number,
        spawnY?: number,
    ) {
        this.scene.physics.pause();

        // Emit scene change event to server before removing listeners
        if (this.scene.multiplayer) {
            this.scene.multiplayer.emitSceneChange(
                sceneKey,
                spawnX || 1000,
                spawnY || 1000,
            );
        }

        this.scene.multiplayer?.removeAllGameListeners();

        this.scene.scene.start(sceneKey, {
            spawnX,
            spawnY,
        });
    }

    enableDebug(color: number = 0x00ff00, alpha: number = 0.3) {
        this.teleportZones.getChildren().forEach((zone) => {
            const sprite = zone as Phaser.Physics.Arcade.Sprite;
            const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
            const debugRect = this.scene.add.rectangle(
                sprite.x,
                sprite.y,
                body.width,
                body.height,
                color,
                alpha,
            );
            debugRect.setDepth(1000);
            const label = this.scene.add.text(
                sprite.x,
                sprite.y,
                sprite.getData("targetScene"),
                {
                    fontSize: "12px",
                    color: "#ffffff",
                    backgroundColor: "#000000",
                },
            );
            label.setOrigin(0.5);
            label.setDepth(1001);
        });
        return this;
    }

    destroy() {
        this.teleportZones.destroy(true);
    }
}
