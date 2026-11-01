import styles from "./CharacterCreationScreen.module.css";
import React, { useState } from "react";
import { CharacterCustomization, CharacterType } from "@/game/character/_types";
import { CharacterPreview } from "./CharacterPreview";
import { CategorySelector } from "./CategorySelector";

type Category =
    | "type"
    | "body"
    | "eyes"
    | "hairstyle"
    | "outfit"
    | "accessory"
    | "item";

interface CategoryTab {
    id: Category;
    label: string;
    icon: string;
}

interface CharacterCreationScreenProps {
    initialCustomization?: CharacterCustomization;
    onComplete: (customization: CharacterCustomization) => void;
    onCancel?: () => void;
    mode: "create" | "edit";
    isLoading?: boolean;
    description?: string;
    footer?: React.ReactNode;
    completeLabel?: string;
    completeDisabled?: boolean;
    inline?: boolean;
}

const CATEGORIES: CategoryTab[] = [
    { id: "type", label: "Type", icon: "👤" },
    { id: "body", label: "Body", icon: "🧍" },
    { id: "eyes", label: "Eyes", icon: "👁️" },
    { id: "hairstyle", label: "Hair", icon: "💇" },
    { id: "outfit", label: "Outfit", icon: "👔" },
    { id: "accessory", label: "Accessory", icon: "👓" },
];

const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
    type: CharacterType.ADULT,
    bodyId: 1,
    eyesId: 1,
    hairstyleId: 1,
    outfitId: 1,
};

export function CharacterCreationScreen({
    initialCustomization,
    onComplete,
    onCancel,
    mode,
    isLoading = false,
    description, footer, completeLabel, completeDisabled = false, inline = false,
}: CharacterCreationScreenProps) {
    const [customization, setCustomization] = useState<CharacterCustomization>(
        initialCustomization || DEFAULT_CUSTOMIZATION,
    );
    const [selectedCategory, setSelectedCategory] = useState<Category>("type");

    const handleUpdate = (updates: Partial<CharacterCustomization>) => {
        setCustomization((prev) => {
            const updated = { ...prev, ...updates };
            if (updates.type !== undefined && updates.type !== prev.type) {
                return {
                    type: updates.type,
                    bodyId: 1,
                    eyesId: 1,
                    hairstyleId: 1,
                    outfitId: 1,
                    accessoryId: undefined,
                    itemId: undefined,
                    itemType: undefined,
                };
            }

            return updated;
        });
    };

    const handleComplete = () => {
        onComplete(customization);
    };

    return (
        <div className={inline ? "w-full" : "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"}>
            <div className={`bg-slate-900 rounded-lg shadow-2xl max-w-6xl w-full overflow-hidden flex flex-col ${inline ? "text-slate-100" : "max-h-[90vh]"}`}>
                {}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">
                            {mode === "create"
                                ? "Create Your Character"
                                : "Edit Character"}
                        </h2>
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                aria-label="Close character creator"
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {description && <p className="px-6 py-3 text-slate-300">{description}</p>}
                <div className={inline ? "flex flex-col md:flex-row" : "flex-1 overflow-hidden flex flex-col md:flex-row"}>
                    {}
                    <div className="md:w-1/3 p-6 flex flex-col items-center justify-center bg-slate-800/50">
                        <div className={inline ? styles.preview : undefined}><CharacterPreview customization={customization} /></div>
                        <div className="mt-4 text-center">
                            <div className="text-sm text-slate-400">
                                {customization.type === CharacterType.ADULT
                                    ? "Adult"
                                    : "Kid"}{" "}
                                Character
                            </div>
                            {!inline && <div className="text-xs text-slate-500 mt-1">
                                Body {customization.bodyId} • Eyes{" "}
                                {customization.eyesId} • Hair{" "}
                                {customization.hairstyleId}
                            </div>}
                        </div>
                    </div>

                    {}
                    <div className="min-w-0 md:w-2/3 flex flex-col">
                        {}
                        <div className="border-b border-slate-700 bg-slate-800/30">
                            <div className="flex overflow-x-auto">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() =>
                                            setSelectedCategory(cat.id)
                                        }
                                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                                            selectedCategory === cat.id
                                                ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                                                : "border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                                        }`}
                                    >
                                        <span>{cat.icon}</span>
                                        <span className="text-sm font-medium">
                                            {cat.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={inline ? styles.options : "flex-1 overflow-y-auto p-6"}>
                            <CategorySelector
                                category={selectedCategory}
                                customization={customization}
                                onSelect={handleUpdate}
                            />
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-700 bg-slate-800/30">
                    {footer}
                    <div className="flex justify-end gap-3 mt-3">
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="px-6 py-2 rounded-lg border-2 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleComplete}
                            disabled={isLoading || completeDisabled}
                            className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:from-cyan-600 hover:to-purple-700 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading
                                ? "Saving..."
                                : completeLabel || (mode === "create"
                                  ? "Create Character"
                                  : "Save Changes")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
