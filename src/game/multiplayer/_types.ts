import { CharacterCustomization } from "../character/_types";

export interface PlayerDto {
    id: string;
    name?: string;
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
    soccerStats?: {
        mmr: number;
        winStreak: number;
    } | null;
}

export interface MovementPacket {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    isAttacking: boolean;
    isKartMode?: boolean;
    timestamp?: number; // Add this
    opts?: { isLocal: boolean };
}
