import { User } from "@/common/store/_types";
import { CharacterCustomization } from "@/game/character/_types";

declare global {
    interface Window {
        __BACKEND_JWT__?: string;
        __BACKEND_USER__?: User;
        __BACKEND_CHARACTER__?: CharacterCustomization; // Replace 'any' with your Character type if available
    }
}

export {};
