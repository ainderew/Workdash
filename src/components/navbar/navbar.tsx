import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { getDisplayName } from "@/common/utils/displayName";
import { ThemeToggle } from "./themeToggle";
import { ProfileMenu } from "./profileMenu";
import { WorkdashMark } from "./workdashMark";

const navLinks = [
    { name: "How it works", href: "#lamps" },
    { name: "Inside", href: "#room" },
    { name: "Status", href: "#status" },
];

export function Navbar() {
    const { data: session, status } = useSession();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const displayName = getDisplayName(
        {
            nickname: session?.backendUser?.nickname,
            name: session?.backendUser?.name || session?.user?.name,
        },
        "User",
    );

    const signedIn = status === "authenticated" && Boolean(session?.user);

    return (
        <header className="wd-board-rail fixed inset-x-0 top-0 z-[100]">
            <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center justify-between gap-6 px-5 sm:px-8">
                <Link href="/" className="flex items-center gap-2.5">
                    <WorkdashMark className="h-[1.375rem] w-auto text-[var(--brd-fg)]" />
                    <span className="text-[1.0625rem] font-bold tracking-tight text-[var(--brd-fg)]">
                        Workdash
                    </span>
                </Link>

                <nav className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="wd-board-legend transition-colors hover:text-[var(--brd-fg)]"
                        >
                            {link.name}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-5 md:flex">
                    <ThemeToggle />
                    {signedIn ? (
                        <>
                            <Link
                                href="/app"
                                className="text-sm font-semibold text-[var(--brd-lamp-ink)] transition-colors hover:text-[var(--brd-fg)]"
                            >
                                Go to the room
                            </Link>
                            <ProfileMenu
                                name={displayName}
                                email={session?.user?.email}
                                image={session?.user?.image}
                            />
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="text-sm font-semibold text-[var(--brd-fg-dim)] transition-colors hover:text-[var(--brd-fg)]"
                        >
                            Sign in
                        </Link>
                    )}
                </div>

                <button
                    className="text-[var(--brd-fg-dim)] transition-colors hover:text-[var(--brd-fg)] md:hidden"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {drawerOpen && (
                <div className="wd-board-rail fixed inset-0 z-[101] px-6 py-5 md:hidden">
                    <div className="flex items-center justify-between">
                        <span className="wd-board-legend">Menu</span>
                        <button
                            onClick={() => setDrawerOpen(false)}
                            aria-label="Close menu"
                            className="text-[var(--brd-fg-dim)] hover:text-[var(--brd-fg)]"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <nav className="mt-10 flex flex-col">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                onClick={() => setDrawerOpen(false)}
                                className="border-b border-[var(--brd-hairline)] py-4 text-lg font-semibold text-[var(--brd-fg)]"
                            >
                                {link.name}
                            </a>
                        ))}
                    </nav>

                    <div className="mt-8 flex items-center justify-between border-b border-[var(--brd-hairline)] pb-5">
                        <span className="wd-board-legend">Theme</span>
                        <ThemeToggle />
                    </div>

                    <Link
                        href={signedIn ? "/app" : "/login"}
                        className="wd-board-button mt-8 w-full"
                    >
                        {signedIn ? "Go to the room" : "Sign in"}
                    </Link>
                </div>
            )}
        </header>
    );
}
