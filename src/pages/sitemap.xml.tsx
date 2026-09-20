import type { GetServerSideProps } from "next";
import { SITE_URL } from "@/common/config/site";

/**
 * Publicly indexable routes. Anything behind auth, plus one-time links and
 * invite URLs, is deliberately absent — see public/robots.txt.
 */
const ROUTES = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/vs", changefreq: "monthly", priority: "0.8" },
    { path: "/changelog", changefreq: "weekly", priority: "0.6" },
    { path: "/login", changefreq: "monthly", priority: "0.5" },
    { path: "/privacy", changefreq: "yearly", priority: "0.3" },
    { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

/**
 * Evaluated once when the server process boots, which on this deploy means
 * the moment the new container starts. That makes it an honest "last changed"
 * rather than a date that moves on every crawl.
 */
const LASTMOD = new Date().toISOString().slice(0, 10);

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    const urls = ROUTES.map(
        (route) => `    <url>
        <loc>${SITE_URL}${route.path}</loc>
        <lastmod>${LASTMOD}</lastmod>
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
