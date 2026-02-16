import { CharacterCustomization } from "@/game/character/_types";
import { Account } from "next-auth";


export interface BackendUser {
    id: number;
    name: string;
    email: string;
    image?: string;
    createdAt?: string;
    updatedAt?: string;
}


export type BackendCharacter = CharacterCustomization;


export interface ExtendedAccount extends Account {
    backendJwt?: string;
    backendJwtExpiresAt?: number;
    backendUser?: BackendUser;
    backendCharacter?: BackendCharacter;
}
