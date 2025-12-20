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
