import { Player } from "@/game/player/player";
import { CharacterCustomization } from "@/game/character/_types";
import { BackendUser } from "@/types/auth";

export type User = {
    name: string;
    nickname?: string | null;
    email?: string;
    image?: string;
    producerIds: string[];
    characterCustomization?: CharacterCustomization;
    spriteSheetDataUrl?: string;
    socketId?: string;
};

export interface UserStore {
    user: User;
    backendUser: BackendUser | null;
    setUser: (user: User) => void;
    updateUser: (updates: Partial<User>) => void;
    setBackendUser: (user: BackendUser) => void;
    updateBackendUser: (updates: Partial<BackendUser>) => void;
    setCharacterCustomization: (customization: CharacterCustomization) => void;
}

export interface PlayersStore {
    playerMap: Record<string, Player>;
    localPlayerId: string;
    setPlayerMap: (playerMap: Record<string, Player>) => void;
    setLocalPlayerId: (playerId: string) => void;
    updatePlayerMap: (id: string, updates: Partial<Player>) => void;
    addPlayerToMap: (id: string, update: Player) => void;
    removePlayerFromMap: (id: string) => void;
}
