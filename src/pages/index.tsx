import React from "react";
import Head from "next/head";
import { Seo } from "@/common/components/Seo";
import {
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_URL,
} from "@/common/config/site";
import { motion, useScroll, useSpring } from "framer-motion";
import { Hero } from "../components/landingPage/heroSection/hero";
import { WalkIn } from "../components/landingPage/walkInSection/walkIn";
import { Marquee } from "../components/landingPage/marquee/marquee";
import { WhyNot } from "../components/landingPage/whyNotSection/whyNot";
import { DemoSection } from "../components/landingPage/demoSection/demoSection";
import { HowItWorks } from "../components/landingPage/howItWorksSection/howItWorks";
import { Origin } from "../components/landingPage/originSection/origin";
import { Faq, FAQ_ITEMS } from "../components/landingPage/faqSection/faq";
import { Footer } from "../components/landingPage/footer/footer";
import { Navbar } from "@/components/navbar/navbar";
import { GUEST_PUBLIC_DISCOVERY } from "@/features/guest/discovery";
import { TRIAL_PREVIEW } from "@/components/landingPage/demoSection/content";

const HOME_DESCRIPTION = GUEST_PUBLIC_DISCOVERY
    ? "Try WorkDash free without signing up. Create a character, invite friends and explore a 2D world with voice chat in your browser. Sign in to save your character."
    : SITE_DESCRIPTION;

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
            {/* The searchable words live in the title; the H1 keeps the voice. */}
            <Seo
                title={GUEST_PUBLIC_DISCOVERY
                    ? `${SITE_NAME}: free 2D hangouts and voice chat | No sign-up trial`
                    : `${SITE_NAME}: a free 2D hangout with proximity chat for friends`}
                description={HOME_DESCRIPTION}
                image={TRIAL_PREVIEW.src}
                imageAlt={TRIAL_PREVIEW.alt}
                imageWidth={TRIAL_PREVIEW.width}
                imageHeight={TRIAL_PREVIEW.height}
                path="/"
            />
            <Head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebApplication",
                            "@id": `${SITE_URL}/#app`,
                            name: SITE_NAME,
                            url: SITE_URL,
                            description: HOME_DESCRIPTION,
                            image: {
                                "@type": "ImageObject",
                                "@id": `${SITE_URL}/#campfire-preview`,
                                contentUrl: `${SITE_URL}${TRIAL_PREVIEW.src}`,
                                url: `${SITE_URL}${TRIAL_PREVIEW.src}`,
                                name: TRIAL_PREVIEW.caption,
                                description: TRIAL_PREVIEW.alt,
                                width: TRIAL_PREVIEW.width,
                                height: TRIAL_PREVIEW.height,
                            },
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
                                "@id": `${SITE_URL}/about#andrew`,
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
                <WhyNot />
                <WalkIn />
                <DemoSection />
                <HowItWorks />
                <Origin />
                <Faq />
                <Footer />
            </div>
        </>
    );
}
