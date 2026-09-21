import React from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

// Charts and the session gate are client-only; nothing here benefits from SSR
// and the admin console must never end up in a crawler's index.
const AdminDashboard = dynamic(
    () =>
        import("@/common/components/Admin/AdminDashboard").then(
            (mod) => mod.AdminDashboard,
        ),
    { ssr: false },
);

export default function AdminPage() {
    return (
        <>
            <Head>
                <title>Admin console — WorkDash</title>
                <meta name="robots" content="noindex, nofollow" />
                <link rel="icon" href="/favicon.svg" />
            </Head>
            <AdminDashboard />
        </>
    );
}
