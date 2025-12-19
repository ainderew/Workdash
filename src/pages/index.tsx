import React from "react";
import { Hero } from "../components/landingPage/heroSection/hero";
import { Features } from "../components/landingPage/featuresSection/features";
import { SocialProof } from "../components/landingPage/socialProof/socialProof";
import { DemoSection } from "../components/landingPage/demoSection/demoSection";
import { Pricing } from "../components/landingPage/pricingSection/pricing";
import { Footer } from "../components/landingPage/footer/footer";
import { Navbar } from "@/components/navbar/navbar";

export default function LandingPage() {
    return (
        <div className="w-full min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200">
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
