import React from "react";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Poppins } from "next/font/google";
import "../styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}: AppProps) {
    return (
        <SessionProvider session={session} refetchOnWindowFocus={false}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem={true}
                storageKey="workdash-theme"
            >
                <div className={poppins.className}>
                    <Component {...pageProps} />
                    <Toaster
                        position="top-right"
                        style={{ background: "#171717" }}
                        closeButton={true}
                    />
                </div>
            </ThemeProvider>
        </SessionProvider>
    );
}
