import "next-auth";
import "next-auth/jwt";
import { BackendUser, BackendCharacter } from "./auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        error?: string;
        backendJwt?: string;
        backendUser?: BackendUser;
        backendCharacter?: BackendCharacter;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        accessTokenExpires?: number;
        refreshToken?: string;
        error?: string;
        backendJwt?: string;
        backendUser?: BackendUser;
        backendCharacter?: BackendCharacter;
    }
}
