import React from "react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            disabled={!mounted}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--brd-hairline)] text-[var(--brd-fg-dim)] transition-colors hover:border-[var(--brd-fg-faint)] hover:text-[var(--brd-fg)] disabled:opacity-50"
            aria-label={
                mounted
                    ? `Switch to ${isDark ? "light" : "dark"} mode`
                    : "Loading theme"
            }
        >
            {/* Before hydration the sun renders so the rail never reflows. */}
            {mounted && !isDark ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
        </button>
    );
}
