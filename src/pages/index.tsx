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
import { Features } from "../components/landingPage/featuresSection/features";
import { DemoSection } from "../components/landingPage/demoSection/demoSection";
import { Status } from "../components/landingPage/statusSection/status";
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
                            // Ties the brand to its repo so search engines
                            // resolve them as one entity.
                            sameAs: ["https://github.com/ainderew/Workdash"],
                            author: {
                                "@type": "Person",
                                name: "Andrew Pinon",
                                url: "https://github.com/ainderew",
                            },
                        }),
                    }}
                />
            </Head>
            <div className="w-full min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)] selection:bg-[var(--wd-landing-accent-soft)]">
                <ScrollProgressBar />
                <Navbar />
                <Hero />
                <Features />
                <DemoSection />
                <Status />
                <Footer />
            </div>
        </>
    );
}
