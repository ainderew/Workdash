import React from "react";
import { CharacterCustomization, CharacterType } from "@/game/character/_types";
import { SpriteFramePreview } from "./SpriteFramePreview";
import {
    // Constants
    BASE_PATH,
    BODY_COUNTS,
    EYES_COUNTS,
    ITEM_COUNTS,
    // Accessory
    ACCESSORY_TYPES,
    encodeAccessoryId,
    getAccessoryPath,
    // Hairstyle
    ADULT_HAIRSTYLE_CONFIG,
    KID_HAIRSTYLE_CONFIG,
    encodeAdultHairstyleId,
    getAdultHairstylePath,
    getKidHairstylePath,
    // Outfit
    ADULT_OUTFIT_TYPES,
    KID_OUTFIT_CONFIG,
    encodeAdultOutfitId,
    getAdultOutfitPath,
    getKidOutfitPath,
    // Body & Eyes
    getAdultBodyPath,
    getKidBodyPath,
    getAdultEyesPath,
    getKidEyesPath,
    // Items
    getSmartphonePath,
    getBookPath,
} from "./AssetConfig";

type Category =
    | "type"
    | "body"
    | "eyes"
    | "hairstyle"
    | "outfit"
    | "accessory"
    | "item";

interface CategorySelectorProps {
    category: Category;
    customization: CharacterCustomization;
    onSelect: (updates: Partial<CharacterCustomization>) => void;
}

export function CategorySelector({
    category,
    customization,
    onSelect,
}: CategorySelectorProps) {
    const isAdult = customization.type === CharacterType.ADULT;

    const renderTypeSelector = () => (
        <div className="grid grid-cols-2 gap-4">
            <button
                onClick={() => onSelect({ type: CharacterType.ADULT })}
                className={`p-6 rounded-lg border-2 transition-all ${
                    isAdult
                        ? "border-cyan-500 bg-cyan-500/20"
                        : "border-slate-600 bg-slate-800 hover:border-slate-500"
                }`}
            >
                <div className="text-xl font-bold">Adult</div>
                <div className="text-sm text-slate-400 mt-2">
                    {BODY_COUNTS.adult} bodies, {ADULT_HAIRSTYLE_CONFIG.total}{" "}
                    hairstyles
                </div>
            </button>
            <button
                onClick={() => onSelect({ type: CharacterType.KID })}
                className={`p-6 rounded-lg border-2 transition-all ${
                    !isAdult
                        ? "border-cyan-500 bg-cyan-500/20"
                        : "border-slate-600 bg-slate-800 hover:border-slate-500"
                }`}
            >
                <div className="text-xl font-bold">Kid</div>
                <div className="text-sm text-slate-400 mt-2">
                    {BODY_COUNTS.kid} bodies, {KID_HAIRSTYLE_CONFIG.total}{" "}
                    hairstyles
                </div>
            </button>
        </div>
    );

    const renderBodySelector = () => {
        const count = isAdult ? BODY_COUNTS.adult : BODY_COUNTS.kid;

        return (
            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: count }, (_, i) => i + 1).map((id) => {
                    const isSelected = customization.bodyId === id;
                    const imagePath = isAdult
                        ? getAdultBodyPath(id, BASE_PATH)
                        : getKidBodyPath(id, BASE_PATH);

                    return (
                        <button
                            key={id}
                            onClick={() => onSelect({ bodyId: id })}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                isSelected
                                    ? "border-cyan-500 bg-cyan-500/20"
                                    : "border-slate-600 bg-slate-800 hover:border-slate-500"
                            }`}
                        >
                            <SpriteFramePreview
                                src={imagePath}
                                row={1}
                                col={18}
                                alt={`Body ${id}`}
                                className="w-full h-auto mx-auto"
                            />
                            <div className="text-xs text-center mt-2">
                                Body {id}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderEyesSelector = () => {
        const count = isAdult ? EYES_COUNTS.adult : EYES_COUNTS.kid;

        return (
            <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: count }, (_, i) => i + 1).map((id) => {
                    const isSelected = customization.eyesId === id;
                    const imagePath = isAdult
                        ? getAdultEyesPath(id, BASE_PATH)
                        : getKidEyesPath(id, BASE_PATH);

                    return (
                        <button
                            key={id}
                            onClick={() => onSelect({ eyesId: id })}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                isSelected
                                    ? "border-cyan-500 bg-cyan-500/20"
                                    : "border-slate-600 bg-slate-800 hover:border-slate-500"
                            }`}
                        >
                            <SpriteFramePreview
                                src={imagePath}
                                row={1}
                                col={18}
                                alt={`Eyes ${id}`}
                                className="w-full h-auto mx-auto"
                            />
                            <div className="text-xs text-center mt-2">
                                Eyes {id}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderHairstyleSelector = () => {
        if (isAdult) {
            const { styles, colors } = ADULT_HAIRSTYLE_CONFIG;

            return (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {Array.from({ length: styles }, (_, styleIdx) => (
                        <div key={styleIdx} className="space-y-2">
                            <div className="text-xs text-slate-400 font-medium">
                                Style {styleIdx + 1}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from(
                                    { length: colors },
                                    (_, colorIdx) => {
                                        const combinedId =
                                            encodeAdultHairstyleId(
                                                styleIdx,
                                                colorIdx,
                                            );
                                        const isSelected =
                                            customization.hairstyleId ===
                                            combinedId;
                                        const imagePath = getAdultHairstylePath(
                                            combinedId,
                                            BASE_PATH,
                                        );

                                        return (
                                            <button
                                                key={colorIdx}
                                                onClick={() =>
                                                    onSelect({
                                                        hairstyleId: combinedId,
                                                    })
                                                }
                                                className={`p-2 rounded-lg border-2 transition-all ${
                                                    isSelected
                                                        ? "border-cyan-500 bg-cyan-500/20"
                                                        : "border-slate-600 bg-slate-800 hover:border-slate-500"
                                                }`}
                                            >
                                                <SpriteFramePreview
                                                    src={imagePath}
                                                    row={1}
                                                    col={18}
                                                    alt={`Hairstyle ${styleIdx + 1}-${colorIdx + 1}`}
                                                    className="w-full h-auto mx-auto"
                                                />
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            const count = KID_HAIRSTYLE_CONFIG.total;

            return (
                <div className="grid grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-2">
                    {Array.from({ length: count }, (_, i) => i + 1).map(
                        (id) => {
                            const isSelected = customization.hairstyleId === id;
                            const imagePath = getKidHairstylePath(
                                id,
                                BASE_PATH,
                            );

                            return (
                                <button
                                    key={id}
                                    onClick={() =>
                                        onSelect({ hairstyleId: id })
                                    }
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        isSelected
                                            ? "border-cyan-500 bg-cyan-500/20"
                                            : "border-slate-600 bg-slate-800 hover:border-slate-500"
                                    }`}
                                >
                                    <SpriteFramePreview
                                        src={imagePath}
                                        row={1}
                                        col={0}
                                        alt={`Hairstyle ${id}`}
                                        className="w-full h-auto mx-auto"
                                    />
                                    <div className="text-xs text-center mt-1">
                                        {id}
                                    </div>
                                </button>
                            );
                        },
                    )}
                </div>
            );
        }
    };

    const renderOutfitSelector = () => {
        if (isAdult) {
            return (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {ADULT_OUTFIT_TYPES.map((outfit) => (
                        <div key={outfit.id} className="space-y-2">
                            <div className="text-xs text-slate-400 font-medium">
                                Style {outfit.id}
                            </div>
                            <div className="grid grid-cols-10 gap-2">
                                {Array.from(
                                    { length: outfit.variants },
                                    (_, variantIdx) => {
                                        const combinedId = encodeAdultOutfitId(
                                            outfit.id,
                                            variantIdx + 1,
                                        );
                                        const isSelected =
                                            customization.outfitId ===
                                            combinedId;
                                        const imagePath = getAdultOutfitPath(
                                            combinedId,
                                            BASE_PATH,
                                        );

                                        return (
                                            <button
                                                key={variantIdx}
                                                onClick={() =>
                                                    onSelect({
                                                        outfitId: combinedId,
                                                    })
                                                }
                                                className={`p-2 rounded-lg border-2 transition-all ${
                                                    isSelected
                                                        ? "border-cyan-500 bg-cyan-500/20"
                                                        : "border-slate-600 bg-slate-800 hover:border-slate-500"
                                                }`}
                                            >
                                                <SpriteFramePreview
                                                    src={imagePath}
                                                    row={1}
                                                    col={0}
                                                    alt={`Outfit ${outfit.id}-${variantIdx + 1}`}
                                                    className="w-full h-auto mx-auto"
                                                />
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            const count = KID_OUTFIT_CONFIG.total;

            return (
                <div className="grid grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-2">
                    {Array.from({ length: count }, (_, i) => i + 1).map(
                        (id) => {
                            const isSelected = customization.outfitId === id;
                            const imagePath = getKidOutfitPath(id, BASE_PATH);

                            return (
                                <button
                                    key={id}
                                    onClick={() => onSelect({ outfitId: id })}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        isSelected
                                            ? "border-cyan-500 bg-cyan-500/20"
                                            : "border-slate-600 bg-slate-800 hover:border-slate-500"
                                    }`}
                                >
                                    <SpriteFramePreview
                                        src={imagePath}
                                        row={1}
                                        col={0}
                                        alt={`Outfit ${id}`}
                                        className="w-full h-auto mx-auto"
                                    />
                                    <div className="text-xs text-center mt-1">
                                        {id}
                                    </div>
                                </button>
                            );
                        },
                    )}
                </div>
            );
        }
    };

    const renderAccessorySelector = () => {
        return (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {/* None option */}
                <div className="space-y-2">
                    <button
                        onClick={() => onSelect({ accessoryId: undefined })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                            !customization.accessoryId
                                ? "border-cyan-500 bg-cyan-500/20"
                                : "border-slate-600 bg-slate-800 hover:border-slate-500"
                        }`}
                    >
                        <div className="w-16 h-16 flex items-center justify-center text-4xl mx-auto">
                            ∅
                        </div>
                        <div className="text-xs text-center mt-1">None</div>
                    </button>
                </div>

                {/* Accessory types with variants */}
                {ACCESSORY_TYPES.map((accessory) => (
                    <div key={accessory.id} className="space-y-2">
                        <div className="text-xs text-slate-400 font-medium">
                            {accessory.displayName}
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                            {Array.from(
                                { length: accessory.variants },
                                (_, variantIdx) => {
                                    const combinedId = encodeAccessoryId(
                                        accessory.id,
                                        variantIdx + 1,
                                    );
                                    const isSelected =
                                        customization.accessoryId ===
                                        combinedId;
                                    const imagePath = getAccessoryPath(
                                        combinedId,
                                        BASE_PATH,
                                    );

                                    if (!imagePath) return null;

                                    return (
                                        <button
                                            key={variantIdx}
                                            onClick={() =>
                                                onSelect({
                                                    accessoryId: combinedId,
                                                })
                                            }
                                            className={`p-2 rounded-lg border-2 transition-all ${
                                                isSelected
                                                    ? "border-cyan-500 bg-cyan-500/20"
                                                    : "border-slate-600 bg-slate-800 hover:border-slate-500"
                                            }`}
                                        >
                                            <SpriteFramePreview
                                                src={imagePath}
                                                row={1}
                                                col={18}
                                                alt={`${accessory.displayName} ${variantIdx + 1}`}
                                                className="w-full h-auto mx-auto"
                                            />
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderItemSelector = () => {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-semibold mb-3">Smartphones</h3>
                    <div className="grid grid-cols-6 gap-3">
                        <button
                            onClick={() =>
                                onSelect({
                                    itemId: undefined,
                                    itemType: undefined,
                                })
                            }
                            className={`p-3 rounded-lg border-2 transition-all ${
                                !customization.itemId
                                    ? "border-cyan-500 bg-cyan-500/20"
                                    : "border-slate-600 bg-slate-800 hover:border-slate-500"
                            }`}
                        >
                            <div className="w-full aspect-square flex items-center justify-center text-4xl">
                                ∅
                            </div>
                            <div className="text-xs text-center mt-1">None</div>
                        </button>
                        {Array.from(
                            { length: ITEM_COUNTS.smartphones },
                            (_, i) => i + 1,
                        ).map((id) => {
                            const isSelected =
                                customization.itemId === id &&
                                customization.itemType === "smartphone";
                            const imagePath = getSmartphonePath(id, BASE_PATH);

                            return (
                                <button
                                    key={id}
                                    onClick={() =>
                                        onSelect({
                                            itemId: id,
                                            itemType: "smartphone",
                                        })
                                    }
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        isSelected
                                            ? "border-cyan-500 bg-cyan-500/20"
                                            : "border-slate-600 bg-slate-800 hover:border-slate-500"
                                    }`}
                                >
                                    <SpriteFramePreview
                                        src={imagePath}
                                        row={1}
                                        col={0}
                                        alt={`Smartphone ${id}`}
                                        className="w-full h-auto mx-auto"
                                    />
                                    <div className="text-xs text-center mt-1">
                                        {id}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold mb-3">Books</h3>
                    <div className="grid grid-cols-6 gap-3">
                        {Array.from(
                            { length: ITEM_COUNTS.books },
                            (_, i) => i + 1,
                        ).map((id) => {
                            const isSelected =
                                customization.itemId === id &&
                                customization.itemType === "book";
                            const imagePath = getBookPath(id, BASE_PATH);

                            return (
                                <button
                                    key={id}
                                    onClick={() =>
                                        onSelect({
                                            itemId: id,
                                            itemType: "book",
                                        })
                                    }
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        isSelected
                                            ? "border-cyan-500 bg-cyan-500/20"
                                            : "border-slate-600 bg-slate-800 hover:border-slate-500"
                                    }`}
                                >
                                    <SpriteFramePreview
                                        src={imagePath}
                                        row={1}
                                        col={0}
                                        alt={`Book ${id}`}
                                        className="w-full h-auto mx-auto"
                                    />
                                    <div className="text-xs text-center mt-1">
                                        {id}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (category) {
            case "type":
                return renderTypeSelector();
            case "body":
                return renderBodySelector();
            case "eyes":
                return renderEyesSelector();
            case "hairstyle":
                return renderHairstyleSelector();
            case "outfit":
                return renderOutfitSelector();
            case "accessory":
                return renderAccessorySelector();
            case "item":
                return renderItemSelector();
            default:
                return null;
        }
    };

    return <div className="w-full">{renderContent()}</div>;
}
