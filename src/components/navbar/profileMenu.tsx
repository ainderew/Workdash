import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { signOutWithCleanup } from "@/common/utils/signOutWithCleanup";

interface ProfileMenuProps {
    name: string;
    email?: string | null;
    image?: string | null;
}

export function ProfileMenu({ name, email, image }: ProfileMenuProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Account menu for ${name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--brd-alu-lo)] bg-[var(--brd-enamel-lit)] transition-colors hover:border-[var(--brd-alu)]"
            >
                {image ? (
                    <Image
                        src={image}
                        alt=""
                        width={34}
                        height={34}
                        className="h-[34px] w-[34px] rounded-full object-cover"
                    />
                ) : (
                    <User className="h-4 w-4 text-[var(--brd-ink-dim)]" />
                )}
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-[102]"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        role="menu"
                        className="absolute right-0 z-[103] mt-3 w-60 overflow-hidden rounded-lg border border-[var(--brd-alu-lo)] bg-[var(--brd-enamel)] shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]"
                    >
                        <div className="border-b border-[var(--brd-rule)] px-4 py-3">
                            <p className="truncate text-sm font-semibold text-[var(--brd-ink)]">
                                {name}
                            </p>
                            {email && (
                                <p className="mt-0.5 truncate text-xs text-[var(--brd-ink-faint)]">
                                    {email}
                                </p>
                            )}
                        </div>
                        <div className="p-1.5">
                            <Link
                                href="/app/settings"
                                role="menuitem"
                                className="flex items-center gap-3 rounded px-3 py-2 text-sm text-[var(--brd-ink-dim)] transition-colors hover:bg-[var(--brd-enamel-lit)] hover:text-[var(--brd-ink)]"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                            <button
                                role="menuitem"
                                onClick={() => signOutWithCleanup({ callbackUrl: "/" })}
                                className="mt-0.5 flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-[var(--brd-signal)] transition-colors hover:bg-[var(--brd-enamel-lit)]"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
