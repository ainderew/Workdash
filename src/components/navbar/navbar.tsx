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
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "./themeToggle";

export function Navbar() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Handle scroll effect for glassmorphism bg
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
            const offset = 80; // Account for navbar height
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
                className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 flex items-center justify-center py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-300/20 dark:border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] h-20 ${
                    scrolled
                        ? "md:py-3 md:bg-white/70 dark:md:bg-slate-950/70 md:backdrop-blur-xl md:border-b md:border-slate-300/20 dark:md:border-cyan-500/20 md:shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:md:shadow-[0_4px_30px_rgba(0,0,0,0.5)] md:h-20"
                        : "md:py-6 md:bg-transparent dark:md:bg-transparent md:border-none md:shadow-none md:h-15"
                }`}
            >
                <div className="max-w-7xl w-full px-6 flex items-center justify-between">
                    <a
                        href="/"
                        onClick={scrollToTop}
                        className="flex items-center gap-3 group cursor-pointer"
                    >
                        <div className="relative">
                            <img
                                src="/assets/workdash-logo.png"
                                alt="WorkDash Logo"
                                className="w-10 h-auto object-contain group-hover:scale-105 group-hover:brightness-110 transition-all duration-300 z-10 relative"
                            />
                            <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-15 dark:opacity-25 group-hover:opacity-30 dark:group-hover:opacity-50 rounded-full transition-opacity duration-300" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
                            Work
                            <span className="text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
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
                                className="flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors tracking-[0.2em]"
                            >
                                {link.name}
                            </a>
                        ))}

                        <ThemeToggle />

                        {status === "authenticated" && session?.user ? (
                            <div className="flex items-center gap-6 pl-4 border-l border-slate-200 dark:border-slate-800">
                                {/* Go To Office Button */}
                                <button
                                    onClick={() => router.push("/app")}
                                    className="flex items-center gap-2 text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors tracking-widest uppercase group"
                                >
                                    <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Go to Office
                                </button>

                                {/* User Dropdown Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setIsProfileOpen(!isProfileOpen)
                                        }
                                        className="relative group cursor-pointer focus:outline-none"
                                        title={session.user.name || "User"}
                                    >
                                        <div
                                            className={`absolute -inset-0.5 bg-cyan-500 rounded-full blur opacity-0 group-hover:opacity-50 transition duration-500 ${isProfileOpen ? "opacity-75" : ""}`}
                                        ></div>
                                        {session.user.image ? (
                                            <img
                                                src={session.user.image}
                                                alt="Profile"
                                                className="relative w-9 h-9 rounded-full border-2 border-white dark:border-slate-950 object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div className="relative w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-950">
                                                <User className="w-4 h-4 text-slate-500" />
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
                                                    className="absolute right-0 mt-3 w-64 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[103] overflow-hidden"
                                                >
                                                    {/* User Header */}
                                                    <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {session.user.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono mt-1">
                                                            {session.user.email}
                                                        </p>
                                                    </div>

                                                    {/* Menu Items */}
                                                    <div className="p-2">
                                                        <button
                                                            onClick={() =>
                                                                router.push(
                                                                    "/app/settings",
                                                                )
                                                            }
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                            Settings
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                signOut({
                                                                    callbackUrl:
                                                                        "/",
                                                                })
                                                            }
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left mt-1"
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
                            <button
                                onClick={() => router.push("/login")}
                                className="relative group px-6 py-2 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/50 clip-path-polygon-sm group-hover:bg-cyan-500 transition-all duration-300" />
                                <span className="relative text-cyan-600 dark:text-cyan-400 dark:group-hover:text-slate-950 group-hover:text-slate-950 text-[10px] font-mono font-bold tracking-widest flex items-center gap-2">
                                    Login <ChevronRight className="w-3 h-3" />
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-cyan-600 dark:text-cyan-400 transition-transform active:scale-90"
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
                            className="fixed top-0 bottom-0 right-0 w-[280px] h-screen bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-300/20 dark:border-cyan-500/20 z-[101] p-8 md:hidden overflow-y-auto"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex flex-col gap-8 mt-16">
                                {status === "authenticated" &&
                                    session?.user && (
                                        <div className="flex items-center gap-3 pb-6 border-b border-slate-200 dark:border-slate-800">
                                            {session.user.image ? (
                                                <img
                                                    src={session.user.image}
                                                    alt="Profile"
                                                    className="w-10 h-10 rounded-full border-2 border-cyan-500/50"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-2 border-cyan-500/50">
                                                    <User className="w-5 h-5 text-slate-500" />
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                                                    {session.user.name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                    {session.user.email}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                                    <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
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
                                        className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 border-b border-slate-200 dark:border-slate-800 pb-4"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="text-cyan-600 dark:text-cyan-500">
                                                {link.icon}
                                            </span>
                                            {link.name}
                                        </span>
                                        <ChevronRight className="w-4 h-4" />
                                    </a>
                                ))}

                                {status === "authenticated" ? (
                                    <div className="flex flex-col gap-3 mt-4">
                                        <button
                                            onClick={() => router.push("/app")}
                                            className="w-full py-4 bg-cyan-500 text-slate-950 font-bold font-mono text-xs uppercase clip-path-polygon shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            GO TO OFFICE
                                        </button>
                                        <button
                                            onClick={() =>
                                                signOut({ callbackUrl: "/" })
                                            }
                                            className="w-full py-4 bg-slate-100 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-800 font-bold font-mono text-xs uppercase transition-colors flex items-center justify-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            LOGOUT
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => router.push("/app")}
                                        className="mt-4 w-full py-4 bg-cyan-500 text-slate-950 font-bold font-mono text-xs uppercase clip-path-polygon shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                                    >
                                        LAUNCH_APP
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </>
    );
}
