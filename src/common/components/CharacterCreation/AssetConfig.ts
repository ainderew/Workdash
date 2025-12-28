/**
 * Character Asset Configuration
 *
 * Single source of truth for all character asset paths and configurations.
 * Used by both React UI components and Phaser game engine.
 *
 */

import { CharacterCustomization, CharacterType } from "@/game/character/_types";
export const BASE_PATH = "/assets/characters/Character_Generator";
export const FRAME_SIZE = 32;

export interface AccessoryType {
    id: number;
    name: string;
    displayName: string;
    variants: number;
}

export const ACCESSORY_TYPES: AccessoryType[] = [
    { id: 1, name: "Ladybug", displayName: "Ladybug", variants: 4 },
    { id: 2, name: "Bee", displayName: "Bee", variants: 3 },
    { id: 3, name: "Backpack", displayName: "Backpack", variants: 10 },
    { id: 4, name: "Snapback", displayName: "Snapback", variants: 6 },
    { id: 5, name: "Dino_Snapback", displayName: "Dino Snapback", variants: 3 },
    { id: 6, name: "Policeman_Hat", displayName: "Policeman Hat", variants: 6 },
    { id: 7, name: "Bataclava", displayName: "Balaclava", variants: 3 },
    { id: 8, name: "Detective_Hat", displayName: "Detective Hat", variants: 3 },
    { id: 9, name: "Zombie_Brain", displayName: "Zombie Brain", variants: 3 },
    { id: 10, name: "Bolt", displayName: "Bolt", variants: 3 },
    { id: 11, name: "Beanie", displayName: "Beanie", variants: 5 },
    { id: 12, name: "Mustache", displayName: "Mustache", variants: 5 },
    { id: 13, name: "Beard", displayName: "Beard", variants: 5 },
    { id: 14, name: "Gloves", displayName: "Gloves", variants: 4 },
    { id: 15, name: "Glasses", displayName: "Glasses", variants: 6 },
    { id: 16, name: "Monocle", displayName: "Monocle", variants: 3 },
    { id: 17, name: "Medical_Mask", displayName: "Medical Mask", variants: 5 },
    { id: 18, name: "Chef", displayName: "Chef Hat", variants: 3 },
    { id: 19, name: "Party_Cone", displayName: "Party Cone", variants: 4 },
];

export function encodeAccessoryId(typeId: number, variantId: number): number {
    let runningTotal = 0;
    for (const acc of ACCESSORY_TYPES) {
        if (acc.id === typeId) {
            return runningTotal + variantId;
        }
        runningTotal += acc.variants;
    }
    return 0;
}

export function decodeAccessoryId(
    combinedId: number,
): { typeId: number; variantId: number; name: string } | null {
    let runningTotal = 0;
    for (const acc of ACCESSORY_TYPES) {
        if (combinedId <= runningTotal + acc.variants) {
            return {
                typeId: acc.id,
                variantId: combinedId - runningTotal,
                name: acc.name,
            };
        }
        runningTotal += acc.variants;
    }
    return null;
}

export function getTotalAccessoryCount(): number {
    return ACCESSORY_TYPES.reduce((sum, a) => sum + a.variants, 0);
}

export interface HairstyleType {
    id: number;
    variants: number;
}

export const ADULT_HAIRSTYLE_TYPES: HairstyleType[] = [
    { id: 1, variants: 7 },
    { id: 2, variants: 7 },
    { id: 3, variants: 7 },
    { id: 4, variants: 7 },
    { id: 5, variants: 7 },
    { id: 6, variants: 7 },
    { id: 7, variants: 7 },
    { id: 8, variants: 7 },
    { id: 9, variants: 7 },
    { id: 10, variants: 7 },
    { id: 11, variants: 7 },
    { id: 12, variants: 7 },
    { id: 13, variants: 7 },
    { id: 14, variants: 7 },
    { id: 15, variants: 7 },
    { id: 16, variants: 7 },
    { id: 17, variants: 7 },
    { id: 18, variants: 7 },
    { id: 19, variants: 7 },
    { id: 20, variants: 7 },
    { id: 21, variants: 7 },
    { id: 22, variants: 7 },
    { id: 23, variants: 7 },
    { id: 24, variants: 7 },
    { id: 25, variants: 7 },
    { id: 26, variants: 7 },
    { id: 27, variants: 6 },
    { id: 28, variants: 6 },
    { id: 29, variants: 6 },
    { id: 30, variants: 1 },
];

export function getTotalAdultHairstyleCount(): number {
    return ADULT_HAIRSTYLE_TYPES.reduce((sum, h) => sum + h.variants, 0);
}

export const KID_HAIRSTYLE_CONFIG = {
    styles: 5,
    colors: 5,
    get total() {
        return this.styles * this.colors;
    },
};

export function encodeAdultHairstyleId(
    styleId: number,
    variantId: number,
): number {
    let runningTotal = 0;
    for (const hairstyle of ADULT_HAIRSTYLE_TYPES) {
        if (hairstyle.id === styleId) {
            return runningTotal + variantId;
        }
        runningTotal += hairstyle.variants;
    }
    return 0;
}

export function decodeAdultHairstyleId(
    combinedId: number,
): { styleId: number; variantId: number } | null {
    let runningTotal = 0;
    for (const hairstyle of ADULT_HAIRSTYLE_TYPES) {
        if (combinedId <= runningTotal + hairstyle.variants) {
            return {
                styleId: hairstyle.id,
                variantId: combinedId - runningTotal,
            };
        }
        runningTotal += hairstyle.variants;
    }
    return null;
}

export interface OutfitType {
    id: number;
    variants: number;
}

export const ADULT_OUTFIT_TYPES: OutfitType[] = [
    { id: 1, variants: 10 },
    { id: 2, variants: 4 },
    { id: 3, variants: 4 },
    { id: 4, variants: 3 },
    { id: 5, variants: 5 },
    { id: 6, variants: 4 },
    { id: 7, variants: 4 },
    { id: 8, variants: 3 },
    { id: 9, variants: 3 },
    { id: 10, variants: 5 },
    { id: 11, variants: 4 },
    { id: 12, variants: 3 },
    { id: 13, variants: 4 },
    { id: 14, variants: 5 },
    { id: 15, variants: 3 },
    { id: 16, variants: 3 },
    { id: 17, variants: 3 },
    { id: 18, variants: 4 },
    { id: 19, variants: 4 },
    { id: 20, variants: 3 },
    { id: 21, variants: 4 },
    { id: 22, variants: 4 },
    { id: 23, variants: 4 },
    { id: 24, variants: 4 },
    { id: 25, variants: 5 },
    { id: 26, variants: 3 },
    { id: 27, variants: 3 },
    { id: 28, variants: 4 },
    { id: 29, variants: 4 },
    { id: 30, variants: 3 },
    { id: 31, variants: 5 },
    { id: 32, variants: 5 },
    { id: 33, variants: 3 },
    { id: 34, variants: 1 },
];

export const KID_OUTFIT_CONFIG = {
    styles: 5,
    colors: 5,
    get total() {
        return this.styles * this.colors;
    },
};

export function encodeAdultOutfitId(
    styleId: number,
    variantId: number,
): number {
    let runningTotal = 0;
    for (const outfit of ADULT_OUTFIT_TYPES) {
        if (outfit.id === styleId) {
            return runningTotal + variantId;
        }
        runningTotal += outfit.variants;
    }
    return 0;
}

export function decodeAdultOutfitId(
    combinedId: number,
): { styleId: number; variantId: number } | null {
    let runningTotal = 0;
    for (const outfit of ADULT_OUTFIT_TYPES) {
        if (combinedId <= runningTotal + outfit.variants) {
            return {
                styleId: outfit.id,
                variantId: combinedId - runningTotal,
            };
        }
        runningTotal += outfit.variants;
    }
    return null;
}

export function getTotalAdultOutfitCount(): number {
    return ADULT_OUTFIT_TYPES.reduce((sum, o) => sum + o.variants, 0);
}

export interface ItemType {
    id: number;
    name: string;
    displayName: string;
    variants: number;
    folder: string;
    usePadding: boolean;
}

export const ITEM_TYPES: ItemType[] = [
    {
        id: 1,
        name: "Book",
        displayName: "Book",
        variants: 6,
        folder: "Books",
        usePadding: true,
    },
    {
        id: 2,
        name: "Smartphone",
        displayName: "Smartphone",
        variants: 5,
        folder: "Smartphones",
        usePadding: false,
    },
];

export function encodeItemId(typeId: number, variantId: number): number {
    let runningTotal = 0;
    for (const item of ITEM_TYPES) {
        if (item.id === typeId) {
            return runningTotal + variantId;
        }
        runningTotal += item.variants;
    }
    return 0;
}

export function decodeItemId(combinedId: number): {
    typeId: number;
    variantId: number;
    name: string;
    folder: string;
    usePadding: boolean;
} | null {
    let runningTotal = 0;
    for (const item of ITEM_TYPES) {
        if (combinedId <= runningTotal + item.variants) {
            return {
                typeId: item.id,
                variantId: combinedId - runningTotal,
                name: item.name,
                folder: item.folder,
                usePadding: item.usePadding,
            };
        }
        runningTotal += item.variants;
    }
    return null;
}

export function getTotalItemCount(): number {
    return ITEM_TYPES.reduce((sum, i) => sum + i.variants, 0);
}

export const BODY_COUNTS = {
    adult: 10,
    kid: 5,
};

export const EYES_COUNTS = {
    adult: 10,
    kid: 5,
};

export function getAdultBodyPath(bodyId: number, basePath = BASE_PATH): string {
    const bodyNum = String(bodyId).padStart(2, "0");
    return `${basePath}/Bodies/32x32/Body_32x32_${bodyNum}.png`;
}

export function getKidBodyPath(bodyId: number, basePath = BASE_PATH): string {
    return `${basePath}/Bodies_kids/32x32/Body_${bodyId}_kid_32x32.png`;
}

export function getAdultEyesPath(eyesId: number, basePath = BASE_PATH): string {
    const eyesNum = String(eyesId).padStart(2, "0");
    return `${basePath}/Eyes/32x32/Eyes_32x32_${eyesNum}.png`;
}

export function getKidEyesPath(eyesId: number, basePath = BASE_PATH): string {
    return `${basePath}/Eyes_kids/32x32/Eyes_kids_32x32_${eyesId}.png`;
}

export function getAdultHairstylePath(
    combinedId: number,
    basePath = BASE_PATH,
): string {
    const decoded = decodeAdultHairstyleId(combinedId);
    if (!decoded) return "";

    const styleNum = String(decoded.styleId).padStart(2, "0");
    const variantNum = String(decoded.variantId).padStart(2, "0");
    return `${basePath}/Hairstyles/32x32/Hairstyle_${styleNum}_32x32_${variantNum}.png`;
}

export function getKidHairstylePath(
    hairstyleId: number,
    basePath = BASE_PATH,
): string {
    const style = Math.ceil(hairstyleId / KID_HAIRSTYLE_CONFIG.colors);
    const color = ((hairstyleId - 1) % KID_HAIRSTYLE_CONFIG.colors) + 1;
    return `${basePath}/Hairstyles_kids/32x32/Hairstyle_kid_${style}_32x32_${color}.png`;
}

export function getAdultOutfitPath(
    combinedId: number,
    basePath = BASE_PATH,
): string {
    const decoded = decodeAdultOutfitId(combinedId);
    if (!decoded) return "";

    const styleNum = String(decoded.styleId).padStart(2, "0");
    const variantNum = String(decoded.variantId).padStart(2, "0");
    return `${basePath}/Outfits/32x32/Outfit_${styleNum}_32x32_${variantNum}.png`;
}

export function getKidOutfitPath(
    outfitId: number,
    basePath = BASE_PATH,
): string {
    const style = Math.ceil(outfitId / KID_OUTFIT_CONFIG.colors);
    const color = ((outfitId - 1) % KID_OUTFIT_CONFIG.colors) + 1;
    return `${basePath}/Outfits_kids/32x32/Outfit_kid_${style}_32x32_${color}.png`;
}

export function getAccessoryPath(
    combinedId: number,
    basePath = BASE_PATH,
): string | null {
    const decoded = decodeAccessoryId(combinedId);
    if (!decoded) return null;

    const typeNum = String(decoded.typeId).padStart(2, "0");
    const variantNum = String(decoded.variantId).padStart(2, "0");

    return `${basePath}/Accessories/32x32/Accessory_${typeNum}_${decoded.name}_32x32_${variantNum}.png`;
}

export function getItemPath(
    combinedId: number,
    basePath = BASE_PATH,
): string | null {
    const decoded = decodeItemId(combinedId);
    if (!decoded) return null;

    const variantNum = decoded.usePadding
        ? String(decoded.variantId).padStart(2, "0")
        : String(decoded.variantId);

    return `${basePath}/${decoded.folder}/32x32/${decoded.name}_32x32_${variantNum}.png`;
}

export interface CharacterLayerPaths {
    body: string;
    eyes: string;
    outfit: string;
    hairstyle: string;
    accessory: string | null;
    item: string | null;
}

/**
 * Get all asset paths needed to render a character
 */
export function getCharacterLayerPaths(
    customization: CharacterCustomization,
    basePath = BASE_PATH,
): CharacterLayerPaths {
    const isAdult = customization.type === CharacterType.ADULT;

    return {
        body: isAdult
            ? getAdultBodyPath(customization.bodyId, basePath)
            : getKidBodyPath(customization.bodyId, basePath),

        eyes: isAdult
            ? getAdultEyesPath(customization.eyesId, basePath)
            : getKidEyesPath(customization.eyesId, basePath),

        outfit: isAdult
            ? getAdultOutfitPath(customization.outfitId, basePath)
            : getKidOutfitPath(customization.outfitId, basePath),

        hairstyle: isAdult
            ? getAdultHairstylePath(customization.hairstyleId, basePath)
            : getKidHairstylePath(customization.hairstyleId, basePath),

        accessory: customization.accessoryId
            ? getAccessoryPath(customization.accessoryId, basePath)
            : null,

        item: customization.itemId
            ? getItemPath(customization.itemId, basePath)
            : null,
    };
}

/**
 * Get all layer paths as an ordered array for rendering
 * Filters out null/empty values
 */
export function getCharacterLayerPathsArray(
    customization: CharacterCustomization,
    basePath = BASE_PATH,
): string[] {
    const paths = getCharacterLayerPaths(customization, basePath);

    return [
        paths.body,
        paths.eyes,
        paths.outfit,
        paths.hairstyle,
        paths.accessory,
        paths.item,
    ].filter((path): path is string => path !== null && path !== "");
}
