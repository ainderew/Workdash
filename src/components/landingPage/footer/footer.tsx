import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-[var(--wd-surface-panel-2)] border-t border-[var(--wd-border-subtle)]">
            {/* CTA Section */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <motion.h2
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-6"
                        >
                            Ready to open
                            <br />
                            the room?
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-xl text-[var(--wd-text-muted)] mb-10 max-w-2xl mx-auto"
                        >
                            Bring your group, keep a room open, and tell us what
                            breaks. That is the whole arrangement for now.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            <Link href="/app" className="wd-landing-btn-primary group">
                                Open the room
                                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Bottom bar */}
            <div className="border-t border-[var(--wd-border-subtle)] py-8 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="text-[var(--wd-text-muted)] text-sm">
                            &copy; 2026 WorkDash. Built for our Dota nights.
                        </div>
                        <a
                            href="https://buymeacoffee.com/andrewapinon"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-1.5 bg-[var(--wd-warning)] hover:bg-[var(--wd-warning)]/80 text-[var(--wd-surface-base)] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span>☕</span>
                            Buy Me a Coffee
                        </a>
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-[var(--wd-text-muted)]">
                        <Link
                            href="/vs"
                            className="hover:text-[var(--wd-landing-accent)] transition-colors"
                        >
                            Compare
                        </Link>
                        <Link
                            href="/changelog"
                            className="hover:text-[var(--wd-landing-accent)] transition-colors"
                        >
                            Changelog
                        </Link>
                        <Link
                            href="/privacy"
                            className="hover:text-[var(--wd-landing-accent)] transition-colors"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/terms"
                            className="hover:text-[var(--wd-landing-accent)] transition-colors"
                        >
                            Terms
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
