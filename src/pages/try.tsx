import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import type { GetServerSideProps } from 'next';
import { Seo } from '@/common/components/Seo';
import { GUEST_PUBLIC_DISCOVERY } from '@/features/guest/discovery';
import styles from '@/features/guest/discovery.module.css';
const GuestEntry = dynamic(() => import('@/features/guest/GuestEntry'), { ssr: false });

export const getServerSideProps: GetServerSideProps = async ({ query, res }) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const play = query.play === '1';
    const noindex = !GUEST_PUBLIC_DISCOVERY || query.play !== undefined;
    if (noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return { props: { play, noindex } };
};

export default function TryWorkDash({ play, noindex }: { play: boolean; noindex: boolean }) {
    return <>
        <Seo title="Try WorkDash without an account | A room for your friends" path="/try" noindex={noindex}
            description="Create a character, invite friends and talk in the real WorkDash world. Try a room for up to eight people and 20 minutes, then sign in to save it." />
        <Head><meta name="referrer" content="no-referrer" /></Head>
        {play ? <GuestEntry /> : <main className={styles.page}>
            <nav className={styles.nav} aria-label="Trial navigation"><a href="/">WorkDash</a><a href="/login">Sign in</a></nav>
            <header className={styles.intro}>
                <h1>Try a room with your friends</h1>
                <p>Make a character, invite your friends and walk into the real WorkDash world. Talk together in the same audio area, with no account needed.</p>
                <p>Up to eight people, including you. Your room lasts 20 minutes and closes after three empty minutes.</p>
            </header>
            <GuestEntry embedded />
            <section className={styles.answers} aria-labelledby="trial-answers">
                <h2 id="trial-answers">Before your friends arrive</h2>
                <details open><summary>How do I invite someone?</summary><p>Create your character and enter the world. Use &quot;Invite a friend&quot; to copy a private invite link. Each friend can choose a character and join without signing up. Anyone with the link can join while places remain, so share it with people you know.</p></details>
                <details><summary>How does voice work?</summary><p>Your microphone starts off. Turn it on when you want to talk. People in the same outlined audio area hear each other; paths between the areas share outdoor audio. You can listen with your mic off. If your browser pauses sound, choose &quot;Enable audio&quot;.</p></details>
                <details><summary>What happens when the trial ends?</summary><p>The temporary room closes after 20 minutes, or after three empty minutes. You can sign in to save your character for 24 hours after the trial deadline. The host can also save the room as a normal workspace. Saving does not extend anonymous access or add guests as account members.</p></details>
                <details><summary>Will signing in replace my character?</summary><p>If your account already has a character, WorkDash asks before replacing it. Each guest saves their own character; only the host can save the room.</p></details>
                <details><summary>Is everything available in the trial?</summary><p>You use the real world, movement and voice. Account features such as chat history, files, video, screen sharing and integrations require signing in. Trial places are limited, so you may need to try again later when the service is busy.</p></details>
                <p>Learn more about <a href="/hangout-with-friends">hanging out with friends</a>, find <a href="/help">microphone help</a> or read our <a href="/privacy">privacy policy</a>.</p>
            </section>
        </main>}
    </>;
}
