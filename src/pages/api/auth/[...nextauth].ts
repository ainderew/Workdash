import NextAuth, { AuthOptions, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { CONFIG } from "@/common/utils/config";
import { ExtendedAccount, BackendUser, BackendCharacter } from "@/types/auth";

interface MagicLinkUser extends User {
    backendJwt: string;
    backendJwtExpiresAt: number;
    backendUser: BackendUser;
    backendCharacter: BackendCharacter;
}


async function refreshAccessToken(token: JWT) {
    try {
        const url = "https://oauth2.googleapis.com/token";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
    } catch (error) {
        console.error("Error refreshing access token", error);

        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

async function performBackendSync(idToken: string) {
    const backendUrl = `${CONFIG.INTERNAL_SFU_URL}/api/auth/google-sync`;

    const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to sync user with backend", response.status, errorText);
        throw new Error("BackendSyncError");
    }

    const data = await response.json();
    const { avatarUrl, ...restUser } = data.user ?? {};
    return {
        token: data.token,
        user: { ...restUser, image: avatarUrl },
        character: data.character,
        // Set expiration to 25 days (less than the 30d server default)
        expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
    };
}

async function refreshBackendToken(existingJwt: string) {
    const backendUrl = `${CONFIG.INTERNAL_SFU_URL}/api/auth/refresh`;

    const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${existingJwt}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to refresh backend token", response.status, errorText);
        throw new Error("BackendRefreshError");
    }

    const data = await response.json();
    const { avatarUrl, ...restUser } = data.user ?? {};
    return {
        token: data.token,
        user: { ...restUser, image: avatarUrl },
        character: data.character,
        expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
    };
}


export const authOptions: AuthOptions = {
    session: { strategy: "jwt" },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
                    access_type: "offline",
                    include_granted_scopes: true,
                    prompt: "consent",
                },
            },
        }),
        CredentialsProvider({
            id: "magic-link",
            name: "Magic Link",
            credentials: {
                token: { type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.token) return null;

                const res = await fetch(
                    `${CONFIG.INTERNAL_SFU_URL}/api/auth/magic-link/verify`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token: credentials.token }),
                    },
                );

                if (!res.ok) return null;

                const data = await res.json();
                return {
                    id: String(data.user.id),
                    email: data.user.email,
                    name: data.user.name,
                    image: data.user.avatarUrl ?? null,
                    backendJwt: data.token,
                    backendJwtExpiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
                    backendUser: { ...data.user, image: data.user.avatarUrl },
                    backendCharacter: data.character,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ account }) {
            if (account?.provider === "google" && account.id_token) {
                try {
                    const syncData = await performBackendSync(account.id_token);

                    const extendedAccount = account as ExtendedAccount;
                    extendedAccount.backendJwt = syncData.token;
                    extendedAccount.backendJwtExpiresAt = syncData.expiresAt;
                    extendedAccount.backendUser = syncData.user;
                    extendedAccount.backendCharacter = syncData.character;

                    return true;
                } catch (error) {
                    console.error("Backend sync error:", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({
            token,
            account,
            user,
        }: {
            token: JWT;
            account: ExtendedAccount | null;
            user?: User | MagicLinkUser;
        }): Promise<JWT> {
            // MAGIC LINK: user object comes from authorize() return
            if (account?.provider === "magic-link" && user) {
                const mlUser = user as MagicLinkUser;
                return {
                    ...token,
                    backendJwt: mlUser.backendJwt,
                    backendJwtExpiresAt: mlUser.backendJwtExpiresAt,
                    backendUser: mlUser.backendUser,
                    backendCharacter: mlUser.backendCharacter,
                    nickname: mlUser.backendUser?.nickname ?? null,
                    authProvider: "magic-link",
                };
            }

            // GOOGLE: existing flow (account is ExtendedAccount)
            if (account) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    accessTokenExpires: account.expires_at
                        ? account.expires_at * 1000
                        : Date.now() + 3600 * 1000,
                    refreshToken: account.refresh_token,
                    backendJwt: account.backendJwt,
                    backendJwtExpiresAt: account.backendJwtExpiresAt,
                    backendUser: account.backendUser,
                    backendCharacter: account.backendCharacter,
                    nickname: account.backendUser?.nickname ?? null,
                    user: token.user,
                    authProvider: "google",
                };
            }

            // TOKEN REFRESH: only refresh Google access token if provider was Google
            const isGoogleUser = token.authProvider === "google";
            const isAccessTokenExpired = isGoogleUser && Date.now() >= (token.accessTokenExpires as number);
            const isBackendTokenExpired = token.backendJwtExpiresAt && Date.now() >= (token.backendJwtExpiresAt as number);

            let newToken = token;

            if (isAccessTokenExpired) {
                newToken = await refreshAccessToken(newToken);
            }

            if ((isBackendTokenExpired || isAccessTokenExpired) && newToken.backendJwt) {
                // Refresh backend token using existing JWT (no raw email sent)
                try {
                    const syncData = await refreshBackendToken(newToken.backendJwt as string);
                    newToken.backendJwt = syncData.token;
                    newToken.backendJwtExpiresAt = syncData.expiresAt;
                    newToken.backendUser = syncData.user;
                    newToken.backendCharacter = syncData.character;
                    newToken.nickname = syncData.user?.nickname ?? null;
                } catch (error) {
                    console.error("Failed to refresh backend token during JWT callback", error);
                }
            }

            return newToken;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (token.accessToken) {
                session.accessToken = token.accessToken as string;
            }

            if (token.backendJwt) {
                session.backendJwt = token.backendJwt as string;
            }

            if (token.backendJwtExpiresAt) {
                session.backendJwtExpiresAt = token.backendJwtExpiresAt as number;
            }

            if (token.backendUser) {
                session.backendUser = token.backendUser;
            }

            if (token.backendCharacter) {
                session.backendCharacter = token.backendCharacter;
            }

            if (token.error) {
                session.error = token.error as string;
            }

            if (session.user) {
                session.user.nickname =
                    token.backendUser?.nickname ?? token.nickname ?? null;
            }

            return session;
        },
    },
};

export default NextAuth(authOptions);
