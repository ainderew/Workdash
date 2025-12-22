import React, { useState } from "react";
import { CharacterCustomizationMenu } from "../CharacterCustomization/CharacterCustomizationMenu";

export function CharacterCustomizationButton() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsMenuOpen(true)}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border-2 border-slate-600 hover:border-slate-500 transition-all shadow-lg"
                title="Customize Character"
            >
                <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                </svg>
            </button>

            <CharacterCustomizationMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
            />
        </>
    );
}
