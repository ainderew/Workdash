import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";

export interface FaqItem {
    q: string;
    a: string;
}

/**
 * Shared with the landing page's FAQPage structured data, so the answers a
 * search engine shows are literally the answers on the page.
 */
export const FAQ_ITEMS: FaqItem[] = [
    {
        q: "Is WorkDash free?",
        a: "Yes. There is no card, no seats and nothing for sale, because there is no billing built yet. If paid extras ever arrive, voice, the room and your chat history stay free. It is in early access, so expect rough edges.",
    },
    {
        q: "Is WorkDash a free Gather alternative?",
        a: "For small groups, yes. Gather ended its free plan in September 2025. WorkDash has the parts small groups use most (a 2D world with voice by room, video and screen sharing) and is free. It is built for groups of up to about twenty, and it does not do large events or maps you design yourself.",
    },
    {
        q: "How many people fit in a room?",
        a: "About twenty is comfortable. WorkDash is built for a friend group where everyone knows each other, not for a large community server.",
    },
    {
        q: "How is this different from Discord?",
        a: "A Discord voice channel is a door you open. WorkDash keeps one room running and shows you who is in it before you join. Once you are inside, voice works by room: you hear the people in the room you are in, and the private office keeps a conversation between the people inside it.",
    },
    {
        q: "Do we have to leave Discord?",
        a: "No. Keep your server for what it does well. WorkDash is the room you hang out in, in a browser tab next to it.",
    },
    {
        q: "Do I need to install anything?",
        a: "No. WorkDash runs in the browser. You can install it as an app if you want a separate window, but that is optional.",
    },
    {
        q: "Does it work on phones?",
        a: "Yes, in your phone's browser. In the world, an on-screen joystick lets you walk around with your thumb. It is early, so a laptop is still the smoother experience.",
    },
    {
        q: "How do I sign in?",
        a: "With a Google account, or with a magic link sent to your email.",
    },
    {
        q: "Do I have to use the 2D world?",
        a: "No. Desk mode is the quiet half: channels, threads and screen sharing, with no sprite to move. You can sit in either and switch whenever.",
    },
];

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
    const [open, setOpen] = useState(index === 0);
    const panelId = `faq-panel-${index}`;

    return (
        <div className="border-b border-[var(--wd-border-subtle)]">
            <h3>
                <button
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                >
                    <span className="text-lg font-bold text-[var(--wd-text-primary)]">
                        {item.q}
                    </span>
                    <ChevronDownIcon
                        aria-hidden="true"
                        className={`w-5 h-5 shrink-0 text-[var(--wd-landing-accent)] transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                        }`}
                    />
                </button>
            </h3>
            {/* Always in the HTML so crawlers and the FAQPage data see every
                answer; `hidden` only collapses it on screen. */}
            <div id={panelId} hidden={!open} className="pb-6 -mt-1">
                <p className="text-[var(--wd-text-muted)] leading-relaxed max-w-2xl">
                    {item.a}
                </p>
            </div>
        </div>
    );
}

export function Faq() {
    return (
        <section
            id="faq"
            className="py-32 bg-[var(--wd-surface-panel-2)] border-y border-[var(--wd-border-subtle)]"
        >
            <div className="max-w-3xl mx-auto px-6">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-12"
                >
                    Common{" "}
                    <span className="text-[var(--wd-landing-accent)]">
                        questions
                    </span>
                </motion.h2>

                <div>
                    {FAQ_ITEMS.map((item, index) => (
                        <FaqRow key={item.q} item={item} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
