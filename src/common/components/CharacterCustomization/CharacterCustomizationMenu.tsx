import React, { useState } from "react";
import { CharacterCustomization } from "@/game/character/_types";
import { CharacterCreationScreen } from "../CharacterCreation/CharacterCreationScreen";
import { CharacterPersistence } from "@/game/character/CharacterPersistence";
import { CharacterEventBus } from "@/game/character/CharacterEventBus";
import useStore from "@/common/store/useStore";

interface CharacterCustomizationMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CharacterCustomizationMenu({
    isOpen,
    onClose,
}: CharacterCustomizationMenuProps) {
    const user = useStore((state) => state.user);
    const setCharacterCustomization = useStore(
        (state) => state.setCharacterCustomization,
    );

    const [initialCustomization] = useState<
        CharacterCustomization | undefined
    >(() => {
        // Try to load from store first, then localStorage, then use default
        return (
            user.characterCustomization ||
            CharacterPersistence.load() ||
            CharacterPersistence.getDefault()
        );
    });

    const handleComplete = (customization: CharacterCustomization) => {
        // Save to localStorage
        CharacterPersistence.save(customization);

        // Update store
        setCharacterCustomization(customization);

        // Emit event to game for real-time update
        CharacterEventBus.emitCharacterUpdate(customization);

        // Close menu
        onClose();
    };

    if (!isOpen) return null;

    return (
        <CharacterCreationScreen
            initialCustomization={initialCustomization}
            onComplete={handleComplete}
            onCancel={onClose}
            mode="edit"
        />
    );
}
