import React from "react";
import Head from "next/head";
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
            <Head>
                <title>Workdash — the room&rsquo;s already open</title>
                <meta
                    name="description"
                    content="Workdash keeps one room running for your friend group: a voice call nobody has to start and a small world you can walk around in. See who's on, sit down. Free while in early access."
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
