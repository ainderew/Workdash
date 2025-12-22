import { CharacterCustomization, CharacterType } from "./_types";

/**
 * Handles character customization persistence to localStorage
 */
export class CharacterPersistence {
    private static readonly STORAGE_KEY = "workdash_character";

    /**
     * Save character customization to localStorage
     */
    static save(customization: CharacterCustomization): void {
        try {
            localStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(customization),
            );
        } catch (error) {
            console.error("Failed to save character customization:", error);
        }
    }

    /**
     * Load character customization from localStorage
     */
    static load(): CharacterCustomization | null {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data) as CharacterCustomization;
            }
        } catch (error) {
            console.error("Failed to load character customization:", error);
        }
        return null;
    }

    /**
     * Get default character customization
     */
    static getDefault(): CharacterCustomization {
        return {
            type: CharacterType.ADULT,
            bodyId: 1,
            eyesId: 1,
            hairstyleId: 1,
            outfitId: 1,
        };
    }

    /**
     * Clear character customization from localStorage
     */
    static clear(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear character customization:", error);
        }
    }
}
