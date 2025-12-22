import { AnimationFrameData } from "./_types";

export const ADULT_ASSET_COUNTS = {
    bodies: 9,
    eyes: 7,
    hairstyles: 203, // 29 styles × 7 colors
    outfits: 127, // Sum of all outfit variants
    accessories: 71, // Sum of all accessory variants
    smartphones: 5,
    books: 6,
};

export const KID_ASSET_COUNTS = {
    bodies: 4,
    eyes: 6,
    hairstyles: 25, // 5 styles × 5 colors
    outfits: 25, // 5 styles × 5 colors
    accessories: 71, // Shared with adults
    smartphones: 5, // Shared with adults
    books: 6, // Shared with adults
};

/**
 * Character_Generator spritesheets are GRID-BASED, not horizontal strips.
 *
 * Typical layout (18 columns × multiple rows):
 * - Row 0 (frames 0-17):   Down-facing / front idle
 * - Row 1 (frames 18-35):  Idle animation
 * - Row 2 (frames 36-53):  Walk side animation
 * - Row 3 (frames 54-71):  Walk up animation
 * - Row 4 (frames 72-89):  Walk down animation
 * - Row 5 (frames 90-107): Sit animation
 * - Row 6 (frames 108-125): Phone/attack animation
 *
 * Frame index = (row * COLUMNS_PER_ROW) + column
 */

const COLUMNS_PER_ROW = 18;

// Helper to generate frame range for a row
const rowFrames = (row: number, startCol: number, endCol: number): number[] => {
    const frames: number[] = [];
    for (let col = startCol; col <= endCol; col++) {
        frames.push(row * COLUMNS_PER_ROW + col);
    }
    return frames;
};

// Based on Character_Generator sprite sheet layout
// Adjust these row numbers based on your actual Spritesheet_animations_GUIDE.png
export const ANIMATION_FRAMES: AnimationFrameData = {
    // Row 1: Idle animation (using first 4 frames)
    idle: rowFrames(1, 0, 3),

    // Row 2: Walk side animation (6 frames)
    walk: rowFrames(2, 0, 5),

    // Row 3: Walk up animation (4 frames)
    walkUp: rowFrames(3, 0, 3),

    // Row 4: Walk down / front walk animation (4 frames)
    walkDown: rowFrames(0, 0, 3), // Often row 0 is front-facing

    // Row 6: Phone/action animation (4 frames) - used for "attack"
    attack: rowFrames(6, 0, 3),
};

/**
 * Alternative: If your spritesheets have a different layout,
 * you may need to adjust the row numbers above.
 *
 * To debug, log the spritesheet dimensions after loading:
 * console.log(`Sheet: ${width}x${height}, Cols: ${width/32}, Rows: ${height/32}`);
 */
