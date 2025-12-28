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
            setCharacterCustomization(customization);
            CharacterPersistence.save(customization);
            CharacterEventBus.emitCharacterUpdate(customization);
            const multiplayer = window.__MULTIPLAYER__;
            if (
                multiplayer &&
                typeof multiplayer.emitCharacterUpdate === "function"
            ) {
                multiplayer.emitCharacterUpdate(customization);
                console.log("Character update emitted to backend via socket");
            } else {
                console.warn(
                    "Multiplayer instance not available for character update broadcast",
                );
            }

            // Persist to backend database
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

                console.log("Character saved to server successfully");
            }

            onClose();
        } catch (error) {
            console.error("Failed to save character:", error);
            // Still close on error - local save succeeded
            onClose();
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
            isLoading={isSaving}
        />
    );
}
