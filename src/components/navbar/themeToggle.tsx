import React from "react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Loader2 } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return (
            <button className="w-8 h-8 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--wd-text-muted)]" />
            </button>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative w-8 h-8 flex items-center justify-center text-[var(--wd-landing-accent)] hover:text-[var(--wd-landing-accent-hover)] transition-colors bg-[var(--wd-landing-accent-soft)] rounded-full cursor-pointer"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
            {theme === "dark" ? (
                <Sun className="w-4 h-4" />
            ) : (
                <Moon className="w-4 h-4" />
            )}
        </button>
    );
}
