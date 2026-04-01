import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
    X,
    Zap,
    Users,
    Globe,
    ChevronRight,
    LogOut,
    User,
    LayoutDashboard,
    Settings,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { getDisplayName } from "@/common/utils/displayName";
import { ThemeToggle } from "./themeToggle";

export function Navbar() {
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const sessionDisplayName = getDisplayName(
        {
            nickname: session?.backendUser?.nickname,
            name: session?.backendUser?.name || session?.user?.name,
        },
        "User",
    );

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        {
            name: "Features",
            href: "#features",
            icon: <Zap className="w-3 h-3" />,
        },
        {
            name: "Demo",
            href: "#demo",
            icon: <Users className="w-3 h-3" />,
        },
        {
            name: "Pricing",
            href: "#pricing",
            icon: <Globe className="w-3 h-3" />,
        },
    ];

    const scrollToSection = (
        e: React.MouseEvent<HTMLAnchorElement>,
        href: string,
    ) => {
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            });
            setIsOpen(false);
        }
    };

    const scrollToTop = (e: React.MouseEvent) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 flex items-center justify-center py-3 bg-[var(--wd-surface-base)]/70 backdrop-blur-xl border-b border-[var(--wd-border-subtle)]/20 shadow-md h-20 ${
                    scrolled
                        ? "md:py-3 md:bg-[var(--wd-surface-base)]/70 md:backdrop-blur-xl md:border-b md:border-[var(--wd-border-subtle)]/20 md:shadow-md md:h-20"
                        : "md:py-6 md:bg-transparent md:border-none md:shadow-none md:h-15"
                }`}
            >
                <div className="max-w-7xl w-full px-6 flex items-center justify-between">
                    <a
                        href="/"
                        onClick={scrollToTop}
                        className="flex items-center gap-3 group cursor-pointer"
                    >
                        <div className="relative">
                            <Image
                                src="/assets/workdash-logo.svg"
                                alt="WorkDash Logo"
                                width={40}
                                height={40}
                                className="w-8 h-auto object-contain group-hover:scale-105 group-hover:brightness-110 transition-all duration-300 z-10 relative"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[var(--wd-text-primary)]">
                            Work
                            <span className="text-[#E85D04]">
                                Dash
                            </span>
                        </span>
                    </a>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                onClick={(e) => scrollToSection(e, link.href)}
                                className="flex items-center gap-2 text-sm font-medium text-[var(--wd-text-muted)] hover:text-[var(--wd-landing-accent)] transition-colors"
                            >
                                {link.name}
                            </a>
                        ))}

                        <ThemeToggle />

                        {status === "authenticated" && session?.user ? (
                            <div className="flex items-center gap-6 pl-4 border-l border-[var(--wd-border-subtle)]">
                                {/* Go To Office Button */}
                                <Link
                                    href="/app"
                                    className="flex items-center gap-2 text-sm font-bold text-[var(--wd-landing-accent)] hover:text-[var(--wd-landing-accent-hover)] transition-colors group"
                                >
                                    <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Go to Office
                                </Link>

                                {/* User Dropdown Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setIsProfileOpen(!isProfileOpen)
                                        }
                                        className="relative group cursor-pointer focus:outline-none"
                                        title={sessionDisplayName}
                                    >
                                        <div
                                            className={`absolute -inset-0.5 bg-[var(--wd-landing-accent)] rounded-full blur opacity-0 group-hover:opacity-50 transition duration-500 ${isProfileOpen ? "opacity-75" : ""}`}
                                        ></div>
                                        {session.user.image ? (
                                            <Image
                                                src={session.user.image}
                                                alt="Profile"
                                                width={36}
                                                height={36}
                                                className="relative w-9 h-9 rounded-full border-2 border-[var(--wd-surface-base)] object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div className="relative w-9 h-9 rounded-full bg-[var(--wd-surface-panel-2)] flex items-center justify-center border-2 border-[var(--wd-surface-base)]">
                                                <User className="w-4 h-4 text-[var(--wd-text-muted)]" />
                                            </div>
                                        )}
                                    </button>

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {isProfileOpen && (
                                            <>
                                                {/* Click Outside Overlay */}
                                                <div
                                                    className="fixed inset-0 z-[102] cursor-default"
                                                    onClick={() =>
                                                        setIsProfileOpen(false)
                                                    }
                                                />

                                                {/* Dropdown Content */}
                                                <motion.div
                                                    initial={{
                                                        opacity: 0,
                                                        y: 10,
                                                        scale: 0.95,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                        scale: 1,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        y: 10,
                                                        scale: 0.95,
                                                    }}
                                                    transition={{
                                                        duration: 0.2,
                                                    }}
                                                    className="absolute right-0 mt-3 w-64 bg-[var(--wd-surface-panel)]/90 backdrop-blur-xl border border-[var(--wd-border-subtle)] rounded-xl shadow-xl z-[103] overflow-hidden"
                                                >
                                                    {/* User Header */}
                                                    <div className="px-4 py-4 border-b border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel-2)]/50">
                                                        <p className="text-sm font-bold text-[var(--wd-text-primary)] truncate">
                                                            {sessionDisplayName}
                                                        </p>
                                                        <p className="text-xs text-[var(--wd-text-muted)] truncate mt-1">
                                                            {session.user.email}
                                                        </p>
                                                    </div>

                                                    {/* Menu Items */}
                                                    <div className="p-2">
                                                        <Link
                                                            href="/app/settings"
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-[var(--wd-text-secondary)] hover:bg-[var(--wd-surface-panel-2)] rounded-lg transition-colors text-left"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                            Settings
                                                        </Link>

                                                        <button
                                                            onClick={() =>
                                                                signOut({
                                                                    callbackUrl:
                                                                        "/",
                                                                })
                                                            }
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-[var(--wd-danger)] hover:bg-[var(--wd-danger-soft)] rounded-lg transition-colors text-left mt-1"
                                                        >
                                                            <LogOut className="w-4 h-4" />
                                                            Sign Out
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="wd-landing-btn-primary"
                            >
                                Login <ChevronRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-[var(--wd-landing-accent)] transition-transform active:scale-90"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Mobile Drawer */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 200,
                            }}
                            className="fixed top-0 bottom-0 right-0 w-[280px] h-screen bg-[var(--wd-surface-base)]/95 backdrop-blur-2xl border-l border-[var(--wd-border-subtle)]/20 z-[101] p-8 md:hidden overflow-y-auto"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 text-[var(--wd-landing-accent)] hover:text-[var(--wd-landing-accent-hover)] transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex flex-col gap-8 mt-16">
                                {status === "authenticated" &&
                                    session?.user && (
                                        <div className="flex items-center gap-3 pb-6 border-b border-[var(--wd-border-subtle)]">
                                            {session.user.image ? (
                                                <Image
                                                    src={session.user.image}
                                                    alt="Profile"
                                                    width={40}
                                                    height={40}
                                                    className="w-10 h-10 rounded-full border-2 border-[var(--wd-landing-accent)]/50"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-[var(--wd-surface-panel-2)] flex items-center justify-center border-2 border-[var(--wd-landing-accent)]/50">
                                                    <User className="w-5 h-5 text-[var(--wd-text-muted)]" />
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[var(--wd-text-primary)] truncate max-w-[150px]">
                                                    {sessionDisplayName}
                                                </span>
                                                <span className="text-[10px] text-[var(--wd-text-muted)] truncate max-w-[150px]">
                                                    {session.user.email}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                <div className="flex items-center justify-between border-b border-[var(--wd-border-subtle)] pb-4">
                                    <span className="text-xs text-[var(--wd-text-secondary)]">
                                        Theme
                                    </span>
                                    <ThemeToggle />
                                </div>

                                {navLinks.map((link) => (
                                    <a
                                        key={link.name}
                                        href={link.href}
                                        onClick={(e) =>
                                            scrollToSection(e, link.href)
                                        }
                                        className="flex items-center justify-between text-sm text-[var(--wd-text-secondary)] hover:text-[var(--wd-landing-accent)] border-b border-[var(--wd-border-subtle)] pb-4"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="text-[var(--wd-landing-accent)]">
                                                {link.icon}
                                            </span>
                                            {link.name}
                                        </span>
                                        <ChevronRight className="w-4 h-4" />
                                    </a>
                                ))}

                                {status === "authenticated" ? (
                                    <div className="flex flex-col gap-3 mt-4">
                                        <Link
                                            href="/app"
                                            className="wd-landing-btn-primary w-full flex items-center justify-center gap-2"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            Go to Office
                                        </Link>
                                        <button
                                            onClick={() =>
                                                signOut({ callbackUrl: "/" })
                                            }
                                            className="wd-landing-btn-secondary w-full flex items-center justify-center gap-2 text-[var(--wd-danger)]"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                ) : (
                                    <Link
                                        href="/app"
                                        className="wd-landing-btn-primary w-full mt-4 text-center"
                                    >
                                        Launch App
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </>
    );
}
