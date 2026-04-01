import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Hero } from "../components/landingPage/heroSection/hero";
import { Features } from "../components/landingPage/featuresSection/features";
import { SocialProof } from "../components/landingPage/socialProof/socialProof";
import { DemoSection } from "../components/landingPage/demoSection/demoSection";
import { Pricing } from "../components/landingPage/pricingSection/pricing";
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
        <div className="w-full min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)] selection:bg-[var(--wd-landing-accent-soft)]">
            <ScrollProgressBar />
            <Navbar />
            <Hero />
            <Features />
            <SocialProof />
            <Pricing />
            <DemoSection />
            <Footer />
        </div>
    );
}
