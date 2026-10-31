import React from "react";
import Head from 'next/head';
import dynamic from 'next/dynamic';
const GuestEntry = dynamic(() => import('@/features/guest/GuestEntry'), { ssr: false });
export default function TryWorkDash() {
    return <><Head><title>Try WorkDash with friends</title><meta name="description" content="Create a character, explore WorkDash and talk with friends. Try a temporary room without an account, then sign in to keep it." /><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Head><GuestEntry /></>;
}
