import React, { useState } from "react";
import { CharacterCustomizationMenu } from "../CharacterCustomization/CharacterCustomizationMenu";
import { SettingsSelectionModal } from "./modal/SettingsSelection.modal";
import { EditNameModal } from "./modal/EditName.modal";
import { Settings } from "lucide-react";
import useUserStore from "@/common/store/useStore";

export function CharacterCustomizationButton() {
    const [activeModal, setActiveModal] = useState<
        "selection" | "name" | "character" | null
    >(null);
    const userName = useUserStore((state) => state.user.name);

    return (
        <>
            <button
                onClick={() => setActiveModal("selection")}
                className="fixed bottom-5 left-10 cursor-pointer p-3 bg-neutral-700 hover:bg-slate-700 rounded-lg border-2 border-slate-600 hover:border-slate-500 shadow-lg"
                title="Settings"
            >
                <Settings size={18} />
            </button>

            {/* Selection Modal */}
            <SettingsSelectionModal
                isOpen={activeModal === "selection"}
                onClose={() => setActiveModal(null)}
                onSelectName={() => setActiveModal("name")}
                onSelectCharacter={() => setActiveModal("character")}
            />

            {/* Edit Name Modal */}
            <EditNameModal
                isOpen={activeModal === "name"}
                onClose={() => setActiveModal(null)}
                currentName={userName}
            />

            {/* Character Customization Modal */}
            <CharacterCustomizationMenu
                isOpen={activeModal === "character"}
                onClose={() => setActiveModal(null)}
            />
        </>
    );
}
