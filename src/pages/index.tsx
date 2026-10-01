import React from "react";
import Head from "next/head";
import { Seo } from "@/common/components/Seo";
import {
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_TAGLINE,
    SITE_URL,
} from "@/common/config/site";
import { motion, useScroll, useSpring } from "framer-motion";
import { Hero } from "../components/landingPage/heroSection/hero";
import { WalkIn } from "../components/landingPage/walkInSection/walkIn";
import { Marquee } from "../components/landingPage/marquee/marquee";
import { DemoSection } from "../components/landingPage/demoSection/demoSection";
import { Status } from "../components/landingPage/statusSection/status";
import { Faq, FAQ_ITEMS } from "../components/landingPage/faqSection/faq";
import { Footer } from "../components/landingPage/footer/footer";
import { Navbar } from "@/components/navbar/navbar";

function ScrollProgressBar() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    return <motion.div className="wd-landing-scroll-progress" style={{ scaleX }} />;
}

export default function LandingPage() {
    return (
        <>
            <Seo title={`${SITE_NAME} — ${SITE_TAGLINE}`} path="/" />
            <Head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebApplication",
                            name: SITE_NAME,
                            url: SITE_URL,
                            description: SITE_DESCRIPTION,
                            applicationCategory: "CommunicationApplication",
                            operatingSystem: "Any (web browser)",
                            browserRequirements: "Requires JavaScript and WebRTC",
                            offers: {
                                "@type": "Offer",
                                price: "0",
                                priceCurrency: "USD",
                            },
                            // No sameAs: the GitHub repo is private and 404s
                            // for crawlers. Add it here if the repo goes public.
                            author: {
                                "@type": "Person",
                                name: "Andrew Pinon",
                                url: "https://github.com/ainderew",
                            },
                        }),
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            mainEntity: FAQ_ITEMS.map((item) => ({
                                "@type": "Question",
                                name: item.q,
                                acceptedAnswer: {
                                    "@type": "Answer",
                                    text: item.a,
                                },
                            })),
                        }),
                    }}
                />
            </Head>
            <div className="w-full min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)] selection:bg-[var(--wd-landing-accent-soft)]">
                <ScrollProgressBar />
                <Navbar />
                <Hero />
                <Marquee />
                <WalkIn />
                <DemoSection />
                <Status />
                <Faq />
                <Footer />
            </div>
        </>
    );
}
