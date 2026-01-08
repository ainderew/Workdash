import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { CONFIG } from "@/common/utils/config";
import { ExtendedAccount } from "@/types/auth";

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: JWT) {
    try {
        const url =
            "https://oauth2.googleapis.com/token?" +
            new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
            });

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
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

async function performBackendSync(email: string, name: string, image?: string) {
    const backendUrl = `${CONFIG.SFU_SERVER_URL}/api/auth/google-sync`;
    console.log("Syncing with backend:", backendUrl);

    const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name, image }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to sync user with backend", response.status, errorText);
        throw new Error("BackendSyncError");
    }

    const data = await response.json();
    return {
        token: data.token,
        user: data.user,
        character: data.character,
        // Set expiration to 25 days (less than the 30d server default)
        expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
    };
}


export const authOptions: AuthOptions = {
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
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                try {
                    const syncData = await performBackendSync(
                        user.email!,
                        user.name!,
                        user.image!
                    );

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
        }: {
            token: JWT;
            account: ExtendedAccount | null;
        }) {
            if (account) {
                return {
                    accessToken: account.access_token,
                    accessTokenExpires: account.expires_at
                        ? account.expires_at * 1000
                        : Date.now() + 3600 * 1000,
                    refreshToken: account.refresh_token,
                    backendJwt: account.backendJwt,
                    backendJwtExpiresAt: account.backendJwtExpiresAt,
                    backendUser: account.backendUser,
                    backendCharacter: account.backendCharacter,
                    user: token.user,
                    ...token,
                };
            }

            // Return previous token if the access token and backend token have not expired yet
            const isAccessTokenExpired = Date.now() >= (token.accessTokenExpires as number);
            const isBackendTokenExpired = token.backendJwtExpiresAt && Date.now() >= (token.backendJwtExpiresAt as number);

            let newToken = token;

            if (isAccessTokenExpired) {
                newToken = await refreshAccessToken(newToken);
            }

            if (isBackendTokenExpired || isAccessTokenExpired) {
                // Refresh backend token if it's expired OR if we just refreshed the google token
                // (refreshing on google refresh keeps them somewhat in sync)
                try {
                    const syncData = await performBackendSync(
                        newToken.email!,
                        newToken.name!,
                        newToken.picture! // token has picture instead of image
                    );
                    newToken.backendJwt = syncData.token;
                    newToken.backendJwtExpiresAt = syncData.expiresAt;
                    newToken.backendUser = syncData.user;
                    newToken.backendCharacter = syncData.character;
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

            return session;
        },
    },
};

export default NextAuth(authOptions);
