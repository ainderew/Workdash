import { Scene } from "phaser";
import { Player } from "../player/player";
import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";

export class AudioZoneManager {
    private scene: Scene;
    private zones: Phaser.GameObjects.Zone[] = [];
    private debugGraphics: Phaser.GameObjects.Graphics | null = null;
    private currentZone: string | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public initializeZones(
        map: Phaser.Tilemaps.Tilemap,
        playersGroup: Phaser.Physics.Arcade.Group,
    ): void {
        const zoneLayer = map.getObjectLayer("AudioZones");

        if (!zoneLayer) {
            console.warn("AudioZones layer not found in map");
            return;
        }

        for (const obj of zoneLayer.objects) {
            const zone = this.scene.add.zone(
                obj.x! + obj.width! / 2,
                obj.y! + obj.height! / 2,
                obj.width!,
                obj.height!,
            );

            this.scene.physics.add.existing(zone, true);

            const zoneId = obj.name || `zone_${obj.id}`;
            zone.setData("zoneId", zoneId);

            this.zones.push(zone);

            this.scene.physics.add.overlap(
                playersGroup,
                zone,
                this
                    .onZoneOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
                undefined,
                this,
            );

            console.log(`Created audio zone: ${zoneId}`);
        }
    }

    private onZoneOverlap(zoneObj: unknown, playerObj: unknown): void {
        const player = playerObj as Player;
        const zoneId = (zoneObj as Phaser.GameObjects.Zone).getData("zoneId");

        if (!player.isLocal) return;

        player.setData("currentFrameZone", zoneId);

        if (this.currentZone !== zoneId) {
            const previousZone = this.currentZone;
            this.currentZone = zoneId;

            MediaTransportService.getInstance().socket.emit(
                "player-zone-changed",
                {
                    playerId: player.id,
                    fromZone: previousZone,
                    toZone: zoneId,
                },
            );
        }
    }

    public checkZoneExits(players: Map<string, Player>): void {
        for (const [, player] of players) {
            if (!player.isLocal) continue;

            const zoneThisFrame = player.getData("currentFrameZone") as
                | string
                | undefined;

            if (this.currentZone && !zoneThisFrame) {
                const previousZone = this.currentZone;
                this.currentZone = null;

                MediaTransportService.getInstance().socket.emit(
                    "player-zone-changed",
                    {
                        playerId: player.id,
                        fromZone: previousZone,
                        toZone: null,
                    },
                );
            }

            player.setData("currentFrameZone", null);
        }
    }

    public enableDebugView(enable: boolean): void {
        if (enable) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(1000);
            this.drawDebugZones();
        } else if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = null;
        }
    }

    private drawDebugZones(): void {
        if (!this.debugGraphics) return;

        for (const zone of this.zones) {
            const zoneId = zone.getData("zoneId") as string;
            const x = zone.x - zone.width / 2;
            const y = zone.y - zone.height / 2;

            this.debugGraphics.lineStyle(2, 0x00ffff, 0.8);
            this.debugGraphics.fillStyle(0x00ffff, 0.15);
            this.debugGraphics.fillRect(x, y, zone.width, zone.height);
            this.debugGraphics.strokeRect(x, y, zone.width, zone.height);

            this.scene.add
                .text(x + 4, y + 4, zoneId, {
                    fontSize: "10px",
                    color: "#ffffff",
                    backgroundColor: "#000000aa",
                    padding: { x: 4, y: 2 },
                })
                .setDepth(1001);
        }
    }
}
