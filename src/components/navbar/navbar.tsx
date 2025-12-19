import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, Users, Globe, ChevronRight } from "lucide-react";
import { useRouter } from "next/router";

export function Navbar() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
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

    // Scroll to top when clicking logo
    const scrollToTop = (e: React.MouseEvent) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 flex items-center justify-center py-3 bg-slate-950/70 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] h-20 ${
                scrolled
                    ? "md:py-3 md:bg-slate-950/70 md:backdrop-blur-xl md:border-b md:border-cyan-500/20 md:shadow-[0_4px_30px_rgba(0,0,0,0.5)] md:h-20"
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
                        <img
                            src="/assets/workdash-logo.png"
                            alt="WorkDash Logo"
                            className="w-10 h-auto object-contain group-hover:scale-105 group-hover:brightness-110 transition-all duration-300 z-10 relative"
                        />
                        {/* Subtle glow behind the new logo */}
                        <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-25 group-hover:opacity-50 rounded-full transition-opacity duration-300" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white font-mono">
                        Work
                        <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
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
                            className="flex items-center gap-2 text-[10px] font-mono text-slate-400 hover:text-cyan-400 transition-colors tracking-[0.2em]"
                        >
                            {link.name}
                        </a>
                    ))}
                    <button
                        onClick={() => router.push("/app")}
                        className="relative group px-6 py-2 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/50 clip-path-polygon-sm group-hover:bg-cyan-500 transition-all duration-300" />
                        <span className="relative text-cyan-400 group-hover:text-slate-950 text-[10px] font-mono font-bold tracking-widest flex items-center gap-2">
                            LAUNCH_APP <ChevronRight className="w-3 h-3" />
                        </span>
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-cyan-400 transition-transform active:scale-90"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Sidebar/Menu */}
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
                        className="fixed top-0 bottom-0 right-0 w-[280px] h-screen bg-slate-950/95 backdrop-blur-2xl border-l border-cyan-500/20 z-[101] p-8 md:hidden overflow-y-auto"
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-6 right-6 text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex flex-col gap-8 mt-16">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    onClick={(e) =>
                                        scrollToSection(e, link.href)
                                    }
                                    className="flex items-center justify-between text-xs font-mono text-slate-300 hover:text-cyan-400 border-b border-slate-800 pb-4"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="text-cyan-500">
                                            {link.icon}
                                        </span>
                                        {link.name}
                                    </span>
                                    <ChevronRight className="w-4 h-4" />
                                </a>
                            ))}
                            <button
                                onClick={() => router.push("/app")}
                                className="mt-4 w-full py-4 bg-cyan-500 text-slate-950 font-bold font-mono text-xs uppercase clip-path-polygon shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                            >
                                LAUNCH_APP
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
