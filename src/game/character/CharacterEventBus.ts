import { EVENT_TYPES } from "./_enums";
import { CharacterCustomization } from "./_types";

/**
 * Custom event bus for character updates
 * Facilitates communication between React UI and Phaser game
 */
export class CharacterEventBus {
    static readonly UPDATE_CHARACTER = "update-character";

    /**
     * Emit character update event
     * Called from React when user changes character
     */
    static emitCharacterUpdate(customization: CharacterCustomization): void {
        window.dispatchEvent(
            new CustomEvent(this.UPDATE_CHARACTER, {
                detail: customization,
            }),
        );
    }

    static emitNameUpdate(newName: string): void {
        window.dispatchEvent(
            new CustomEvent(EVENT_TYPES.UPDATE_NAME, {
                detail: { newName },
            }),
        );
    }

    /**
     * Listen for character update events
     * Called from Phaser to respond to React changes
     * @returns Cleanup function to remove listener
     */
    static onCharacterUpdate(
        callback: (customization: CharacterCustomization) => void,
    ): () => void {
        const handler = (event: Event) => {
            const customEvent = event as CustomEvent<CharacterCustomization>;
            callback(customEvent.detail);
        };

        window.addEventListener(this.UPDATE_CHARACTER, handler);

        // Return cleanup function
        return () => window.removeEventListener(this.UPDATE_CHARACTER, handler);
    }
}
