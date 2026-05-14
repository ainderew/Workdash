import React from "react";
import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="manifest" href="/manifest.webmanifest" />
                <meta name="theme-color" content="#C2410C" />
                <meta name="application-name" content="WorkDash" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-title" content="WorkDash" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />
                <meta name="mobile-web-app-capable" content="yes" />
            </Head>
            <body>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            try {
                                const allowedThemes = ['classic', 'cyber', 'eco', 'a11y', 'discord', 'discord-classic'];
                                const storedTheme = localStorage.getItem('workdash:theme');
                                if (storedTheme && allowedThemes.includes(storedTheme)) {
                                    document.documentElement.setAttribute('data-theme', storedTheme);
                                } else {
                                    document.documentElement.setAttribute('data-theme', 'classic');
                                }

                                const theme = localStorage.getItem('workdash-theme') || 'system';
                                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                    document.documentElement.classList.add('dark');
                                }
                            } catch (e) {}
                        `,
                    }}
                />
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
