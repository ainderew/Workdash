import React from "react";
import Link from "next/link";
import { WorkdashMark } from "@/components/navbar/workdashMark";

export function Footer() {
    return (
        <footer className="mt-4 border-t border-[var(--brd-hairline)]">
            <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <WorkdashMark className="h-5 w-auto text-[var(--brd-fg-faint)]" />
                    <span className="wd-board-ledger">
                        &copy; {new Date().getFullYear()} Workdash
                    </span>
                </div>

                <nav className="flex flex-wrap items-center gap-x-7 gap-y-3">
                    <Link
                        href="/privacy"
                        className="wd-board-ledger transition-colors hover:text-[var(--brd-fg)]"
                    >
                        Privacy
                    </Link>
                    <Link
                        href="/terms"
                        className="wd-board-ledger transition-colors hover:text-[var(--brd-fg)]"
                    >
                        Terms
                    </Link>
                    <a
                        href="https://buymeacoffee.com/andrewapinon"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wd-board-ledger transition-colors hover:text-[var(--brd-fg)]"
                    >
                        Buy me a coffee
                    </a>
                </nav>
            </div>
        </footer>
    );
}
