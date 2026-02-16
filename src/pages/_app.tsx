





















import React from "react";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import "../styles/globals.css"; 
import { Toaster } from "@/components/ui/sonner";

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
                <Component {...pageProps} />
                <Toaster
                    position="top-right"
                    style={{ background: "#171717" }}
                    closeButton={true}
                />
            </ThemeProvider>
        </SessionProvider>
    );
}
