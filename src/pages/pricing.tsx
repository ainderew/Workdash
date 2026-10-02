import React from "react";
import { Navbar } from "@/components/navbar/navbar";
import { Footer } from "@/components/landingPage/footer/footer";
import { Pricing } from "@/components/landingPage/pricingSection/pricing";
import { Seo } from "@/common/components/Seo";

export default function PricingPage() {
    return (
        <>
            <Seo
                title="Pricing — WorkDash"
                description="WorkDash is free. Paid plans are still a sketch: Den+ for a whole workspace and Regular for one person. Nothing is for sale yet."
                path="/pricing"
            />
            <div className="w-full min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)]">
                <Navbar />
                <main>
                    <Pricing />
                </main>
                <Footer />
            </div>
        </>
    );
}
