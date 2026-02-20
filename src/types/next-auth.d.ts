import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";
import { BackendUser, BackendCharacter } from "./auth";

declare module "next-auth" {
    interface Session {
        user?: DefaultSession["user"] & {
            nickname?: string | null;
        };
        accessToken?: string;
        error?: string;
        backendJwt?: string;
        backendJwtExpiresAt?: number;
        backendUser?: BackendUser;
        backendCharacter?: BackendCharacter;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        nickname?: string | null;
        accessToken?: string;
        accessTokenExpires?: number;
        refreshToken?: string;
        error?: string;
        backendJwt?: string;
        backendJwtExpiresAt?: number;
        backendUser?: BackendUser;
        backendCharacter?: BackendCharacter;
    }
}
