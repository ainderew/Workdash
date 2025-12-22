import React, { useState } from "react";
import { useSession } from "next-auth/react"; // Import useSession
import { CharacterCustomization } from "@/game/character/_types";
import { CharacterCreationScreen } from "../CharacterCreation/CharacterCreationScreen";
import { CharacterPersistence } from "@/game/character/CharacterPersistence";
import { CharacterEventBus } from "@/game/character/CharacterEventBus";
import useStore from "@/common/store/useStore";
import { CONFIG } from "@/common/utils/config";
// import { toast } from "react-toastify"; // Optional

interface CharacterCustomizationMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CharacterCustomizationMenu({
    isOpen,
    onClose,
}: CharacterCustomizationMenuProps) {
    const { data: session } = useSession(); // Get session to access JWT
    const user = useStore((state) => state.user);
    const setCharacterCustomization = useStore(
        (state) => state.setCharacterCustomization,
    );
    const [isSaving, setIsSaving] = useState(false);

    const [initialCustomization] = useState<CharacterCustomization | undefined>(
        () => {
            return (
                user.characterCustomization ||
                CharacterPersistence.load() ||
                CharacterPersistence.getDefault()
            );
        },
    );

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

            // 2. Save to localStorage (Backup/Fast load)
            CharacterPersistence.save(customization);

            // 3. Update Global React Store
            setCharacterCustomization(customization);

            // 4. Emit event to Game (Phaser) for real-time visual update
            CharacterEventBus.emitCharacterUpdate(customization);

            // toast.success("Character saved!");

            // 5. Close menu
            onClose();
        } catch (error) {
            console.error("Failed to save character:", error);
            // toast.error("Failed to save changes. Please try again.");

            // Optional: Decide if you want to close the menu on error or keep it open
            // onClose();
        } finally {
            setIsSaving(false);
        }
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
