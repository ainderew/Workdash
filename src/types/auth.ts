import { CharacterCustomization } from "@/game/character/_types";
import { Account } from "next-auth";

/**
 * Backend user response from authentication
 */
export interface BackendUser {
    id: number;
    name: string;
    email: string;
    image?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Backend character is the same as CharacterCustomization
 */
export type BackendCharacter = CharacterCustomization;

/**
 * Extended Account with backend data
 */
export interface ExtendedAccount extends Account {
    backendJwt?: string;
    backendUser?: BackendUser;
    backendCharacter?: BackendCharacter;
}
