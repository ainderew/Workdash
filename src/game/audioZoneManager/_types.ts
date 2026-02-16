export enum AudioMode {
    ISOLATED = "isolated", 
    PROXIMITY = "proximity", 
    BROADCAST = "broadcast", 
    GLOBAL = "global", 
}

export interface AudioZone {
    id: string;
    name: string;
    bounds: Phaser.Geom.Rectangle;
    audioMode: AudioMode;
    maxParticipants?: number;
    currentOccupants: Set<string>;
}

export interface ZoneTransition {
    playerId: string;
    fromZone: string | null;
    toZone: string | null;
    timestamp: number;
}
