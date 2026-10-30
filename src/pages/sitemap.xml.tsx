import type { GetServerSideProps } from "next";
import { SITE_URL } from "@/common/config/site";

/**
 * Publicly indexable routes. Anything behind auth, plus one-time links and
 * invite URLs, is deliberately absent — see public/robots.txt.
 */
const ROUTES = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/vs", changefreq: "monthly", priority: "0.8" },
    { path: "/gather-alternative", changefreq: "monthly", priority: "0.8" },
    { path: "/discord-alternative", changefreq: "monthly", priority: "0.8" },
    { path: "/hangout-with-friends", changefreq: "monthly", priority: "0.8" },
    { path: "/about", changefreq: "monthly", priority: "0.6" },
    { path: "/help", changefreq: "monthly", priority: "0.7" },
    { path: "/pricing", changefreq: "monthly", priority: "0.7" },
    { path: "/changelog", changefreq: "weekly", priority: "0.6" },
    { path: "/privacy", changefreq: "yearly", priority: "0.3" },
    { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

// Omit lastmod until actual per-page content modification dates are available.
// A server restart is not a content update.
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    const urls = ROUTES.map(
        (route) => `    <url>
        <loc>${SITE_URL}${route.path}</loc>
        <changefreq>${route.changefreq}</changefreq>
        <priority>${route.priority}</priority>
    </url>`,
    ).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.write(xml);
    res.end();

    return { props: {} };
};

export default function Sitemap() {
    return null;
}
