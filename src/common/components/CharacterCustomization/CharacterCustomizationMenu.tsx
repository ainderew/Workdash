import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { CharacterCustomization } from "@/game/character/_types";
import { CharacterCreationScreen } from "../CharacterCreation/CharacterCreationScreen";
import { CharacterPersistence } from "@/game/character/CharacterPersistence";
import { CharacterEventBus } from "@/game/character/CharacterEventBus";
import useStore from "@/common/store/useStore";
import { CONFIG } from "@/common/utils/config";

interface CharacterCustomizationMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CharacterCustomizationMenu({
    isOpen,
    onClose,
}: CharacterCustomizationMenuProps) {
    const { data: session } = useSession();
    const user = useStore((state) => state.user);
    const setCharacterCustomization = useStore(
        (state) => state.setCharacterCustomization,
    );
    const [isSaving, setIsSaving] = useState(false);

    const currentCustomization = useMemo(() => {
        return (
            user.characterCustomization ||
            CharacterPersistence.load() ||
            CharacterPersistence.getDefault()
        );
    }, [user.characterCustomization, isOpen]);

    const handleComplete = async (customization: CharacterCustomization) => {
        setIsSaving(true);
        try {
            const token = session?.backendJwt;

            if (!token) {
                console.warn("No backend JWT found, skipping server save.");
            } else {
                const response = await fetch(
                    `${CONFIG.SFU_SERVER_URL}/api/character/update`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(customization),
                    },
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(
                        `Server responded with ${response.status}: ${errorText}`,
                    );
                }
            }

            CharacterPersistence.save(customization);
            setCharacterCustomization(customization);
            CharacterEventBus.emitCharacterUpdate(customization);

            onClose();
        } catch (error) {
            console.error("Failed to save character:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <CharacterCreationScreen
            key={isOpen ? "open" : "closed"}
            initialCustomization={currentCustomization}
            onComplete={handleComplete}
            onCancel={onClose}
            mode="edit"
        />
    );
}
