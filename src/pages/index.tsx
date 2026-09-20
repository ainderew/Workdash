import React from "react";
import Head from "next/head";
import { Navbar } from "@/components/navbar/navbar";
import { Hero } from "../components/landingPage/heroSection/hero";
import { Features } from "../components/landingPage/featuresSection/features";
import { DemoSection } from "../components/landingPage/demoSection/demoSection";
import { Status } from "../components/landingPage/statusSection/status";
import { Footer } from "../components/landingPage/footer/footer";

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
            <div className="wd-board-page min-h-screen w-full">
                <Navbar />
                <main>
                    <Hero />
                    <Features />
                    <DemoSection />
                    <Status />
                </main>
                <Footer />
            </div>
        </>
    );
}
