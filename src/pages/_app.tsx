import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Poppins, Archivo } from "next/font/google";
import "../styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    display: "swap",
});

// Signage face for the landing board: engraved-plate legend lettering.
// The width axis is what makes a name plate read as a name plate.
const archivo = Archivo({
    subsets: ["latin"],
    axes: ["wdth"],
    variable: "--font-board",
    display: "swap",
});

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}: AppProps) {
    useEffect(() => {
        if (
            typeof window === "undefined" ||
            !("serviceWorker" in navigator) ||
            process.env.NODE_ENV !== "production"
        ) {
            return;
        }
        navigator.serviceWorker.register("/sw.js").catch(() => {
            // Registration failures are non-fatal — app still works without PWA install.
        });
    }, []);

    return (
        <SessionProvider session={session} refetchOnWindowFocus={false}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem={true}
                storageKey="workdash-theme"
            >
                <div className={`${poppins.className} ${archivo.variable}`}>
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
