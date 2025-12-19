import React from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
export function Footer() {
    return (
        <footer className="bg-slate-900 border-t border-slate-800">
            {/* CTA Section */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20,
                        }}
                        whileInView={{
                            opacity: 1,
                            y: 0,
                        }}
                        viewport={{
                            once: true,
                        }}
                        transition={{
                            duration: 0.6,
                        }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Ready to transform your
                            <br />
                            remote culture?
                        </h2>

                        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                            Join teams who&apos;ve discovered that remote work
                            doesn&apos;t mean disconnected work.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="group px-8 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-orange-500/50 transition-all hover:scale-105 flex items-center justify-center gap-2">
                                Get started free
                                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer Links */}
            <div className="border-t border-slate-800 py-8 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="text-slate-500 text-sm">
                            © 2024 WorkDash. Building better remote culture.
                        </div>
                        <a
                            href="https://buymeacoffee.com/andrewapinon"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span>☕</span>
                            Buy Me a Coffee
                        </a>
                    </div>

                    <div className="flex gap-8 text-sm text-slate-400">
                        <a
                            href="/privacy"
                            className="hover:text-white transition-colors"
                        >
                            Privacy
                        </a>
                        <a
                            href="/terms"
                            className="hover:text-white transition-colors"
                        >
                            Terms
                        </a>
                        <a
                            href="#"
                            className="hover:text-white transition-colors"
                        >
                            Contact
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
