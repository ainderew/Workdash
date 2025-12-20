// import React from "react";
// import "@/styles/globals.css";
// import type { AppProps } from "next/app";
//
// export default function App({ Component, pageProps }: AppProps) {
//     return <Component {...pageProps} />;
// }

// import React from "react";
// import "@/styles/globals.css";
// import type { AppProps } from "next/app";
// import { SessionProvider } from "next-auth/react";
//
// export default function App({
//     Component,
//     pageProps: { session, pageProps },
// }: AppProps) {
//     <SessionProvider session={session}>
//         <Component {...pageProps} />
//     </SessionProvider>;
// }
// pages/_app.tsx
import React from "react";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import "../styles/globals.css"; // Make sure this path is correct
import { Toaster } from "@/components/ui/sonner";

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}: AppProps) {
    return (
        <SessionProvider session={session}>
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
