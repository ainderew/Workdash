import React, { useState } from "react";
import { CharacterCustomizationMenu } from "../CharacterCustomization/CharacterCustomizationMenu";
import { Settings } from "lucide-react";

export function CharacterCustomizationButton() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsMenuOpen(true)}
                className="absolute top-10 right-10 cursor-pointer p-3 bg-neutral-700 hover:bg-slate-700 rounded-lg border-2 border-slate-600 hover:border-slate-500 transition-all shadow-lg"
                title="Customize Character"
            >
                <Settings size={18} />
            </button>

            <CharacterCustomizationMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
            />
        </>
    );
}
