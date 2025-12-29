import { CharacterCustomization } from "../character/_types";

export interface PlayerDto {
    id: string;
    name?: string;
    x: number;
    y: number;
    isInFocusMode: boolean;
    isAttacking: boolean;
    vx: number;
    vy: number;
    t?: Date;
    characterCustomization?: CharacterCustomization;
    opts: {
        isLocal: boolean;
    };
    character?: CharacterCustomization;
}

export interface MovementPacket {
    id: string;
    name?: string;
    x: number;
    y: number;
    isAttacking: boolean;
    vx: number;
    vy: number;
    opts: { isLocal: boolean };
}
