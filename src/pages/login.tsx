import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    WifiIcon,
    BatteryIcon,
    ShieldCheckIcon,
    LockIcon,
    UserIcon,
    MailIcon,
    ArrowRightIcon,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const { status } = useSession();
    const router = useRouter();

    // Reusing your mouse tracking logic for the background parallax
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20,
            });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Show loading state while checking authentication
    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-cyan-600 dark:text-cyan-400 font-mono text-sm">
                    AUTHENTICATING...
                </div>
            </div>
        );
    }

    // Show authenticated state with options
    if (status === "authenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center space-y-6 max-w-md px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 mb-4 border-2 border-cyan-200 dark:border-cyan-800">
                        <ShieldCheckIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Already Authenticated
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                            SESSION_ACTIVE • CREDENTIALS_VERIFIED
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            onClick={() => router.push("/app")}
                            className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all transform active:scale-[0.98]"
                        >
                            Continue to office
                        </button>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="w-full px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-all"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 py-20">
            {/* --- BACKGROUND LAYERS (Copied from Hero) --- */}
            <div className="absolute inset-0 bg-grid-pattern opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 dark:from-slate-950/50 via-transparent to-slate-50 dark:to-slate-950 pointer-events-none" />
            <div className="scanlines absolute inset-0 opacity-30 pointer-events-none z-20" />

            {/* Glowing Orbs */}
            <motion.div
                style={{ x: mousePosition.x * 10, y: mousePosition.y * 10 }}
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 dark:bg-cyan-500/30 rounded-full blur-[120px]"
            />
            <motion.div
                style={{ x: mousePosition.x * -10, y: mousePosition.y * -10 }}
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/30 rounded-full blur-[120px]"
            />

            {/* --- HUD ELEMENTS (Corner Stats) --- */}
            <div className="absolute top-8 left-6 md:left-12 flex flex-col gap-2 opacity-50 pointer-events-none z-30">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    <WifiIcon className="w-3 h-3" />
                    <span>LINK: SECURE</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    <ShieldCheckIcon className="w-3 h-3" />
                    <span>PROTOCOL: AUTH_V2</span>
                </div>
            </div>

            <div className="absolute top-8 right-6 md:right-12 flex flex-col items-end gap-2 opacity-50 pointer-events-none z-30">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    <span>BATTERY</span>
                    <BatteryIcon className="w-3 h-3" />
                </div>
                <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    ID: GUEST_USER
                </div>
            </div>

            {/* --- MAIN AUTH CONTAINER --- */}
            <div className="relative z-40 w-full max-w-md px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Decoratiive Top Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 mb-4 border border-cyan-200 dark:border-cyan-800">
                            <LockIcon className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isLogin ? "Welcome Back" : "Join the Simulation"}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-mono">
                            {isLogin
                                ? "Enter credentials to resume session."
                                : "Initialize new user profile."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Google Button */}
                        <button
                            onClick={() => signIn("google")}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                Continue with Google
                            </span>
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-mono">
                                    OR MANUAL OVERRIDE
                                </span>
                            </div>
                        </div>

                        {/* Forms */}
                        <form
                            className="space-y-4"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            <AnimatePresence mode="wait">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative group">
                                            <UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="USERNAME"
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="relative group">
                                <MailIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="EMAIL_ADDRESS"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect
                                            x="3"
                                            y="11"
                                            width="18"
                                            height="11"
                                            rx="2"
                                            ry="2"
                                        ></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    placeholder="PASSWORD"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                                />
                            </div>

                            <button className="w-full relative group overflow-hidden bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all transform active:scale-[0.98]">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative flex items-center justify-center gap-2 uppercase tracking-wider text-sm">
                                    {isLogin
                                        ? "Initialize Session"
                                        : "Create Account"}
                                    <ArrowRightIcon className="w-4 h-4" />
                                </span>
                            </button>
                        </form>
                    </div>

                    {/* Footer / Toggle */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isLogin
                                ? "Don't have access credentials? "
                                : "Already have a profile? "}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline decoration-2 underline-offset-4"
                            >
                                {isLogin ? "Request Access" : "Log In"}
                            </button>
                        </p>
                    </div>
                </motion.div>

                {/* Bottom decorative text */}
                <div className="mt-8 text-center opacity-40">
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                        Secure Connection • 256-bit Encryption • v.2.4.0
                    </p>
                </div>
            </div>
        </section>
    );
}
