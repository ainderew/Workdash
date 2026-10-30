/** Read-only smoke audit of rendered public HTML. Not a ranking or schema validator. */
import { JSDOM } from "jsdom";
import sharp from "sharp";

const base = new URL(process.argv[2] || "http://localhost:8083");
const canonicalOrigin = "https://workdash.site";
const failures = [];
const warnings = [];
const pages = [];
const seenTitles = new Set();
const seenDescriptions = new Set();
const check = (condition, message) => {
    if (!condition) failures.push(message);
};
async function get(path) {
    const response = await fetch(new URL(path, base), {
        signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return { response, text: await response.text() };
}

try {
    const faviconResponse = await fetch(new URL("/favicon-96x96.png", base), {
        signal: AbortSignal.timeout(20000),
    });
    check(faviconResponse.ok, "Search PNG favicon must be reachable");
    if (faviconResponse.ok) {
        const favicon = Buffer.from(await faviconResponse.arrayBuffer());
        const metadata = await sharp(favicon).metadata();
        check(
            metadata.width === 96 && metadata.height === 96,
            "Search favicon must be a square 96px PNG",
        );
        const { data, info } = await sharp(favicon)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const pixel =
            (Math.floor(info.height * 0.2) * info.width +
                Math.floor(info.width * 0.2)) *
            info.channels;
        check(
            data[pixel + 3] === 255 &&
                data[pixel] > data[pixel + 1] &&
                data[pixel + 1] > data[pixel + 2],
            "Search favicon lost its orange background",
        );
    }
    const { text: sitemap } = await get("/sitemap.xml");
    const xml = new JSDOM(sitemap, { contentType: "application/xml" }).window
        .document;
    const urls = [...xml.querySelectorAll("url > loc")].map(
        (node) => new URL(node.textContent),
    );
    check(urls.length > 0, "Sitemap contains no URLs");
    check(
        new Set(urls.map((url) => url.href)).size === urls.length,
        "Duplicate sitemap URLs",
    );
    for (const path of [
        "/about",
        "/discord-alternative",
        "/hangout-with-friends",
        "/help",
    ]) {
        check(
            urls.some((url) => url.pathname === path),
            `${path}: missing from sitemap`,
        );
    }
    const { text: robots } = await get("/robots.txt");
    check(
        robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`),
        "robots.txt must link the canonical sitemap",
    );
    check(
        !/^Disallow:\s*\/\s*$/im.test(robots),
        "robots.txt contains a site-wide disallow; inspect its user-agent group",
    );
    for (const url of urls) {
        check(
            url.origin === canonicalOrigin,
            `Unexpected sitemap origin: ${url.origin}`,
        );
        check(
            !/^\/(api|invite|app|admin)(\/|$)/.test(url.pathname),
            `${url.pathname}: private route in sitemap`,
        );
        const { response, text } = await get(url.pathname);
        const document = new JSDOM(text).window.document;
        const label = url.pathname;
        check(
            Boolean(
                document.querySelector(
                    'link[rel="icon"][href="/favicon-96x96.png"][sizes="96x96"]',
                ),
            ),
            `${label}: missing search PNG favicon declaration`,
        );
        const meta = (name) =>
            document.querySelector(`meta[name="${name}"]`)?.content;
        const og = (name) =>
            document.querySelector(`meta[property="og:${name}"]`)?.content;
        const title = document.title.trim();
        const description = meta("description")?.trim();
        check(
            response.headers.get("content-type")?.includes("text/html"),
            `${label}: expected HTML`,
        );
        check(
            document.documentElement.lang === "en",
            `${label}: missing English document language`,
        );
        check(
            document.querySelectorAll("h1").length === 1,
            `${label}: expected one H1 in server HTML`,
        );
        check(Boolean(title), `${label}: missing title`);
        check(!seenTitles.has(title), `${label}: duplicate title`);
        seenTitles.add(title);
        check(Boolean(description), `${label}: missing description`);
        check(
            !seenDescriptions.has(description),
            `${label}: duplicate description`,
        );
        seenDescriptions.add(description);
        const canonicals = document.querySelectorAll('link[rel="canonical"]');
        check(
            canonicals.length === 1 && canonicals[0].href === url.href,
            `${label}: incorrect or duplicate canonical`,
        );
        check(
            !/noindex|none/i.test(meta("robots") || ""),
            `${label}: noindex in sitemap`,
        );
        check(
            !/noindex|none/i.test(response.headers.get("x-robots-tag") || ""),
            `${label}: noindex header`,
        );
        check(
            og("title") === title &&
                og("description") === description &&
                og("url") === url.href,
            `${label}: Open Graph does not match page metadata`,
        );
        check(
            Boolean(og("image")) && Boolean(og("image:alt")),
            `${label}: missing share image or alt text`,
        );
        check(
            meta("twitter:card") === "summary_large_image",
            `${label}: missing share card`,
        );
        const schemas = [
            ...document.querySelectorAll('script[type="application/ld+json"]'),
        ].map((script) => JSON.parse(script.textContent));
        if (label === "/") {
            check(
                schemas.some((schema) => schema["@type"] === "WebApplication"),
                "Homepage: missing app schema",
            );
            for (const schema of schemas.filter(
                (schema) => schema["@type"] === "FAQPage",
            )) {
                for (const item of schema.mainEntity || []) {
                    check(
                        document.body.textContent.includes(item.name) &&
                            document.body.textContent.includes(
                                item.acceptedAnswer?.text,
                            ),
                        `Homepage: FAQ schema differs from rendered content: ${item.name}`,
                    );
                }
            }
        }
        if (label === "/about") {
            const graph = schemas.flatMap(
                (schema) => schema["@graph"] || [schema],
            );
            check(
                graph.some(
                    (node) =>
                        node["@type"] === "AboutPage" && node.url === url.href,
                ),
                "About: missing AboutPage schema",
            );
            const person = graph.find((node) => node["@type"] === "Person");
            check(
                person?.name && document.body.textContent.includes(person.name),
                "About: maker schema must match visible text",
            );
        }
        pages.push({
            path: label,
            title,
            structuredDataBlocks: schemas.length,
            analyticsPresent: text.includes("data-website-id"),
        });
    }
    if (!pages.some((page) => page.analyticsPresent))
        warnings.push(
            "No Umami script found in server HTML. Check configured production build variables and browser loading; this does not prove analytics is absent.",
        );
    warnings.push(
        "This checks public HTML only. Search Console indexing, real crawler/WAF access, schema eligibility and analytics delivery need separate verification.",
    );
} catch (error) {
    failures.push(error.message);
}
console.log(
    JSON.stringify(
        {
            checkedAt: new Date().toISOString(),
            base: base.origin,
            pages,
            failures,
            warnings,
        },
        null,
        2,
    ),
);
process.exitCode = failures.length ? 1 : 0;
