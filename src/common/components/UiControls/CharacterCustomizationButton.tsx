import React, { useEffect, useState } from "react";
import { CharacterCustomizationMenu } from "../CharacterCustomization/CharacterCustomizationMenu";
import { SettingsSelectionModal } from "./modal/SettingsSelection.modal";
import { EditNameModal } from "./modal/EditName.modal";
import { BackgroundMusicOptInModal } from "./modal/BackgroundMusicOptIn.modal";
import { Settings } from "lucide-react";
import useUserStore from "@/common/store/useStore";
import useUiStore from "@/common/store/uiStore";
import { EventBus } from "@/game/EventBus";

export function CharacterCustomizationButton() {
    const userName = useUserStore((state) => state.user.name);
    const {
        isCharacterCustomizationOpen,
        characterCustomizationMode,
        openCharacterCustomization,
        closeCharacterCustomization,
        setCharacterCustomizationMode,
    } = useUiStore();

    const [showMusicOptIn, setShowMusicOptIn] = useState(false);

    useEffect(() => {
        // Listen for the prompt event from BackgroundMusicManager
        const handlePrompt = () => {
            setShowMusicOptIn(true);
        };

        EventBus.on("prompt-background-music-opt-in", handlePrompt);

        return () => {
            EventBus.off("prompt-background-music-opt-in", handlePrompt);
        };
    }, []);

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
            <BackgroundMusicOptInModal
                isOpen={showMusicOptIn}
                onClose={() => setShowMusicOptIn(false)}
            />
        </>
    );
}
