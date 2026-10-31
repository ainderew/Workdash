import useWorldAudioStore, { audioAreaName } from "@/common/store/worldAudioStore";
import type { Scene } from "phaser";
import type { Player } from "../player/player";
import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportService";
import useChatV2Store from "@/common/store/chatV2Store";
import { logger } from "@/common/utils/logger";

export class AudioZoneManager {
    private scene: Scene;
    private zones: Phaser.GameObjects.Zone[] = [];
    private guideGraphics: Phaser.GameObjects.Graphics | null = null;
    private guideLabels: Phaser.GameObjects.Text[] = [];
    private guideState = "";
    private currentZone: string | null = null;
    private mediaSocketId: string | undefined;
    private outsideZone: string | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public initializeZones(
        map: Phaser.Tilemaps.Tilemap,
    ): void {
        const zoneLayer = map.getObjectLayer("AudioZones");

        if (!zoneLayer) {
            console.warn("AudioZones layer not found in map");
            return;
        }

        this.outsideZone = this.scene.sys.settings.key === "MainMap" ? "outdoors" : null;

        for (const obj of zoneLayer.objects) {
            const zone = this.scene.add.zone(
                obj.x! + obj.width! / 2,
                obj.y! + obj.height! / 2,
                obj.width!,
                obj.height!,
            );

            const zoneId = obj.name || `zone_${obj.id}`;
            zone.setData("zoneId", zoneId);

            this.zones.push(zone);

            logger.log(`Created audio zone: ${zoneId}`);
        }
    }

    public update(players: Map<string, Player>): void {
        this.updateAreaGuide();
        const socket = MediaTransportService.getInstance().socket;
        // Do not queue stale zone transitions while disconnected.
        if (!socket.connected) return;
        if (socket.id !== this.mediaSocketId) {
            this.currentZone = null;
            this.mediaSocketId = socket.id;
        }

        for (const player of players.values()) {
            if (!player.isLocal) continue;
            // Evaluate the feet every rendered frame. Arcade overlap callbacks
            // can skip frames when its fixed physics step has not run yet.
            const x = player.x;
            const y = player.y + player.displayHeight / 2 - 8;
            const zone = this.zones.find((candidate) =>
                x >= candidate.x - candidate.width / 2 &&
                x < candidate.x + candidate.width / 2 &&
                y >= candidate.y - candidate.height / 2 &&
                y < candidate.y + candidate.height / 2,
            );
            // Named conversation areas take priority over the outdoor paths.
            const nextZone = zone?.getData("zoneId") as string | undefined;
            const zoneId = nextZone ?? (
                this.scene.physics.world.bounds.contains(x, y) ? this.outsideZone : null
            );
            if (zoneId === this.currentZone) continue;
            const previousZone = this.currentZone;
            this.currentZone = zoneId;
            socket.emit("player-zone-changed", {
                playerId: player.id,
                fromZone: previousZone,
                toZone: zoneId,
                workspaceId: useChatV2Store.getState().selectedWorkspaceId || undefined,
            });
        }
    }

    private clearAreaGuide(): void {
        this.guideGraphics?.destroy();
        this.guideGraphics = null;
        this.guideLabels.forEach(label => label.destroy());
        this.guideLabels = [];
    }

    private updateAreaGuide(): void {
        const { showAreas, connected, zoneId } = useWorldAudioStore.getState();
        const state = showAreas && connected ? `visible:${zoneId}` : "hidden";
        if (state === this.guideState) return;
        this.guideState = state;
        this.clearAreaGuide();
        if (!showAreas || !connected) return;

        const theme = getComputedStyle(document.documentElement);
        const rgb = theme.getPropertyValue("--wd-accent-rgb").trim().split(/\s+/).map(Number);
        const color = rgb.length === 3 && rgb.every(Number.isFinite)
            ? (rgb[0] << 16) | (rgb[1] << 8) | rgb[2] : 0x2563eb;
        const ink = theme.getPropertyValue("--wd-text-primary").trim() || "white";
        const panel = theme.getPropertyValue("--wd-surface-panel").trim() || "black";
        const guide = this.scene.add.graphics().setDepth(1000);
        this.guideGraphics = guide;
        for (const zone of this.zones) {
            const id = zone.getData("zoneId") as string;
            const x = zone.x - zone.width / 2;
            const y = zone.y - zone.height / 2;
            const active = id === zoneId;
            if (active) guide.fillStyle(color, 0.08).fillRect(x, y, zone.width, zone.height);
            // Dark under-stroke keeps the area boundary legible over pale paths.
            guide.lineStyle(5, 0x000000, 0.6).strokeRect(x, y, zone.width, zone.height);
            guide.lineStyle(3, color, active ? 1 : 0.7).strokeRect(x, y, zone.width, zone.height);
            this.guideLabels.push(this.scene.add.text(x + 8, y + 8, audioAreaName(id), {
                fontFamily: "sans-serif", fontSize: "14px", color: ink,
                backgroundColor: panel, padding: { x: 8, y: 5 },
            }).setDepth(1001));
        }
    }

    destroy() {
        this.clearAreaGuide();
        this.zones.forEach(zone => zone.destroy());
        useWorldAudioStore.getState().resetConnection();
    }
}
