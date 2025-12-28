import { CharacterCustomization } from "@/game/character/_types";
import { BackendUser } from "./auth";

declare global {
    interface Window {
        __BACKEND_JWT__?: string;
        __BACKEND_USER__?: BackendUser;
        __BACKEND_CHARACTER__?: CharacterCustomization;
    }
}

export {};
