import { CharacterCustomization } from "../character/_types";

export interface PlayerDto {
    id: string;
    userId?: number;
    name?: string;
    nickname?: string | null;
    x: number;
    y: number;
    isInFocusMode: boolean;
    isAttacking: boolean;
    isKartMode?: boolean;
    vx: number;
    vy: number;
    t?: Date;
    characterCustomization?: CharacterCustomization;
    opts: {
        isLocal: boolean;
    };
    character?: CharacterCustomization;
    currentScene?: string;
    /** Seat (Tiled object id) the player is sitting on */
    seatId?: string | null;
    soccerStats?: {
        speed: number;
        kickPower: number;
        dribbling: number;
        mmr?: number;
        winStreak?: number;
    } | null;
}

export interface MovementPacket {
    id: string;
    name?: string;
    nickname?: string | null;
    x: number;
    y: number;
    isAttacking: boolean;
    isKartMode?: boolean;
    vx: number;
    vy: number;
    opts: { isLocal: boolean };
    isInFocusMode?: boolean;
}
