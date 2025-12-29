export enum AudioMode {
    ISOLATED = "isolated", // Only hear people in same zone
    PROXIMITY = "proximity", // Hear based on distance (default outdoor)
    BROADCAST = "broadcast", // Everyone in zone hears equally (presentations)
    GLOBAL = "global", // Hear everywhere (admin announcements)
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
