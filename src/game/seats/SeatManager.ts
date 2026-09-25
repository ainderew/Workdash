import { EventBus } from "../EventBus";
import type { Player } from "../player/player";
import type { Multiplayer } from "../multiplayer/multiplayer";
import { nearestSeat, seatPose, type Seat } from "./seatLayer";
import { SEAT_PROMPT_EVENT, SEAT_TOGGLE_EVENT, type SeatPrompt } from "./seatEvents";

interface SeatScene extends Phaser.Scene {
    players: Map<string, Player>;
    localPlayerId: string;
    multiplayer: Multiplayer;
}

/**
 * Sitting on the map's seats: offers the nearest seat (E or the prompt's
 * button), claims it through the server so two people can't take the same
 * one, and keeps every player's pose in step with who sits where.
 */
export class SeatManager {
    private seatsById: Map<string, Seat>;
    /** playerId -> seatId, from the server (and our own granted claims) */
    private seatOf = new Map<string, string>();
    private claiming = false;
    private sitKey?: Phaser.Input.Keyboard.Key;
    private lastPrompt = "null";

    constructor(
        private scene: SeatScene,
        private seats: Seat[],
    ) {
        this.seatsById = new Map(seats.map((seat) => [seat.id, seat]));
        scene.multiplayer.watchSeats((playerId, seatId) => {
            if (seatId) this.seatOf.set(playerId, seatId);
            else this.seatOf.delete(playerId);
        });
        this.sitKey = scene.input.keyboard?.addKey("E", false);
        EventBus.on(SEAT_TOGGLE_EVENT, this.toggle, this);
        scene.events.once("shutdown", () => this.destroy());
    }

    update() {
        const { players, localPlayerId } = this.scene;
        for (const [id, player] of players) {
            if (id === localPlayerId) continue;
            const seat = this.seatsById.get(this.seatOf.get(id) ?? "");
            if (seat && player.seat?.id !== seat.id) player.sitAt(seatPose(seat));
            else if (!seat && player.seat) player.standUp();
        }

        const local = players.get(localPlayerId);
        if (!local) return;
        local.onSeatedMove ??= () => this.stand();
        if (this.sitKey && Phaser.Input.Keyboard.JustDown(this.sitKey) && !local.isInputBlocked()) {
            this.toggle();
        }
        this.showPrompt(this.promptFor(local));
    }

    private promptFor(local: Player): SeatPrompt {
        if (local.seat) return { state: "seated", seatId: local.seat.id };
        const feet = { x: local.physicsState.x, y: local.physicsState.y + local.displayHeight / 2 - 2 };
        const seat = nearestSeat(this.seats, feet);
        if (!seat) return null;
        const occupantId = this.occupantOf(seat.id);
        if (occupantId && occupantId !== this.scene.localPlayerId) {
            const occupant = this.scene.players.get(occupantId)?.name || "Someone";
            return { state: "taken", seatId: seat.id, occupant };
        }
        return { state: "free", seatId: seat.id };
    }

    private occupantOf(seatId: string) {
        for (const [playerId, id] of this.seatOf) if (id === seatId) return playerId;
        return undefined;
    }

    private toggle() {
        const local = this.scene.players.get(this.scene.localPlayerId);
        if (!local) return;
        if (local.seat) {
            this.stand();
            return;
        }
        const prompt = this.promptFor(local);
        const seat = prompt?.state === "free" ? this.seatsById.get(prompt.seatId) : undefined;
        if (seat) void this.sit(seat);
    }

    private async sit(seat: Seat) {
        if (this.claiming) return;
        this.claiming = true;
        const result = await this.scene.multiplayer.claimSeat(seat.id);
        this.claiming = false;
        const local = this.scene.players.get(this.scene.localPlayerId);
        if (!local || local.seat) return;
        if (result.ok) {
            this.seatOf.set(this.scene.localPlayerId, seat.id);
            local.sitAt(seatPose(seat));
        } else if (result.occupantId) {
            this.seatOf.set(result.occupantId, seat.id);
        }
    }

    private stand() {
        const local = this.scene.players.get(this.scene.localPlayerId);
        if (!local?.seat) return;
        local.standUp();
        this.seatOf.delete(this.scene.localPlayerId);
        this.scene.multiplayer.releaseSeat();
    }

    private showPrompt(prompt: SeatPrompt) {
        const key = JSON.stringify(prompt);
        if (key === this.lastPrompt) return;
        this.lastPrompt = key;
        EventBus.emit(SEAT_PROMPT_EVENT, prompt);
    }

    private destroy() {
        EventBus.off(SEAT_TOGGLE_EVENT, this.toggle, this);
        if (this.sitKey) this.scene.input.keyboard?.removeKey(this.sitKey);
        this.showPrompt(null);
    }
}
