import NextAuth, { AuthOptions, Account } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { CONFIG } from "@/common/utils/config";

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
                    const backendUrl = `${CONFIG.SFU_SERVER_URL}/api/auth/google-sync`;
                    console.log("Attempting to sync with backend:", backendUrl);
                    console.log("User data:", {
                        email: user.email,
                        name: user.name,
                    });

                    // Send the user data to your Express Backend
                    const response = await fetch(backendUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            email: user.email,
                            name: user.name,
                            // image: user.image, // Optional: if you want to save their avatar
                        }),
                    });

                    console.log("Backend response status:", response.status);

                    if (response.ok) {
                        const data = await response.json();
                        console.log("Backend sync successful, received token");

                        // Store backend JWT token in the account object
                        // This will be accessible in the jwt callback
                        (account as any).backendJwt = data.token;
                        (account as any).backendUser = data.user;
                        (account as any).backendCharacter = data.character;

                        return true; // Login successful
                    } else {
                        const errorText = await response.text();
                        console.error("Failed to sync user with backend");
                        console.error("Status:", response.status);
                        console.error("Response:", errorText);
                        return false; // Blocks login if backend sync fails
                    }
                } catch (error) {
                    console.error("Backend sync error:", error);
                    console.error("EXPRESS_API_URL:", CONFIG.SFU_SERVER_URL);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, account }: { token: JWT; account: Account | null }) {
            if (account) {
                return {
                    accessToken: account.access_token,
                    accessTokenExpires: account.expires_at
                        ? account.expires_at * 1000
                        : Date.now() + 3600 * 1000,
                    refreshToken: account.refresh_token,
                    backendJwt: (account as any).backendJwt,
                    backendUser: (account as any).backendUser,
                    backendCharacter: (account as any).backendCharacter,
                    user: token.user,
                };
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token);
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (token.accessToken) {
                session.accessToken = token.accessToken as string;
            }

            if (token.backendJwt) {
                session.backendJwt = token.backendJwt as string;
            }

            if (token.backendUser) {
                session.backendUser = token.backendUser as any;
            }

            if (token.backendCharacter) {
                session.backendCharacter = token.backendCharacter as any;
            }

            if (token.error) {
                session.error = token.error as string;
            }

            return session;
        },
    },
};

export default NextAuth(authOptions);
