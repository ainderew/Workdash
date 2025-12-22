export enum CharacterType {
    ADULT = "ADULT",
    KID = "KID",
}

export interface CharacterCustomization {
    type: CharacterType;
    bodyId: number;
    eyesId: number;
    hairstyleId: number;
    outfitId: number;
    accessoryId?: number;
    itemId?: number;
    itemType?: "smartphone" | "book";
}

export interface CharacterAssetPaths {
    body: string;
    eyes: string;
    hairstyle: string;
    outfit: string;
    accessory?: string;
    item?: string;
}

export interface AnimationFrameData {
    idle: number[];
    walk: number[];
    walkUp: number[];
    walkDown: number[];
    attack: number[];
}
