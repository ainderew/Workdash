import React from "react";
import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
    return (
        <Html lang="en">
            <Head />
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
