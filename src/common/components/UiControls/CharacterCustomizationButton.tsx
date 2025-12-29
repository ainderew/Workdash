import React from "react";
import { CharacterCustomizationMenu } from "../CharacterCustomization/CharacterCustomizationMenu";
import { SettingsSelectionModal } from "./modal/SettingsSelection.modal";
import { EditNameModal } from "./modal/EditName.modal";
import { Settings } from "lucide-react";
import useUserStore from "@/common/store/useStore";
import useUiStore from "@/common/store/uiStore";

export function CharacterCustomizationButton() {
    const userName = useUserStore((state) => state.user.name);
    const {
        isCharacterCustomizationOpen,
        characterCustomizationMode,
        openCharacterCustomization,
        closeCharacterCustomization,
        setCharacterCustomizationMode,
    } = useUiStore();

    return (
        <>
            <button
                onClick={() => openCharacterCustomization("selection")}
                className="fixed bottom-5 left-10 cursor-pointer p-3 bg-neutral-700 hover:bg-slate-700 rounded-lg border-2 border-slate-600 hover:border-slate-500 shadow-lg"
                title="Settings"
            >
                <Settings size={18} />
            </button>

            <SettingsSelectionModal
                isOpen={
                    isCharacterCustomizationOpen &&
                    characterCustomizationMode === "selection"
                }
                onClose={closeCharacterCustomization}
                onSelectName={() => setCharacterCustomizationMode("name")}
                onSelectCharacter={() =>
                    setCharacterCustomizationMode("character")
                }
            />
            <EditNameModal
                isOpen={
                    isCharacterCustomizationOpen &&
                    characterCustomizationMode === "name"
                }
                onClose={closeCharacterCustomization}
                currentName={userName}
            />
            <CharacterCustomizationMenu
                isOpen={
                    isCharacterCustomizationOpen &&
                    characterCustomizationMode === "character"
                }
                onClose={closeCharacterCustomization}
            />
        </>
    );
}
