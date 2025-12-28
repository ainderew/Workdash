import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useUserStore from "@/common/store/useStore";
import { UserStore } from "@/common/store/_types";
import { CharacterCreationScreen } from "../CharacterCreation/CharacterCreationScreen";
import { CharacterCustomization } from "@/game/character/_types";
import { CharacterPersistence } from "@/game/character/CharacterPersistence";

type SplashStep = "name" | "character";

function SplashScreen() {
    const updateUser = useUserStore((state: UserStore) => state.updateUser);
    const setCharacterCustomization = useUserStore(
        (state: UserStore) => state.setCharacterCustomization,
    );
    const [step, setStep] = useState<SplashStep>("name");
    const [name, setName] = useState("");

    function handleNameInput() {
        if (!name.trim()) return;
        setStep("character");
    }

    function handleCharacterCreation(customization: CharacterCustomization) {
        // Save character to localStorage
        CharacterPersistence.save(customization);
        updateUser({ name });
        setCharacterCustomization(customization);

        // Save to localStorage (for legacy compatibility)
        localStorage.setItem(
            "user",
            JSON.stringify({ name, characterCustomization: customization }),
        );
    }

    return (
        <div className="splash galaxy-animated w-full h-full flex justify-center items-center text-white">
            {step === "name" ? (
                <div className="z-10 flex w-full max-w-sm items-center gap-2">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleNameInput();
                            }
                        }}
                        type="text"
                        maxLength={13}
                        placeholder="Display Name"
                    />
                    <Button
                        className="text-black cursor-pointer"
                        type="submit"
                        variant="outline"
                        onClick={handleNameInput}
                    >
                        Enter
                    </Button>
                </div>
            ) : (
                <CharacterCreationScreen
                    onComplete={handleCharacterCreation}
                    mode="create"
                />
            )}
        </div>
    );
}

export default SplashScreen;
