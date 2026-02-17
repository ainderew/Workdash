import type { NextApiRequest, NextApiResponse } from "next";

type LinkPreviewPayload = {
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
};

const REQUEST_TIMEOUT_MS = 7000;
const MAX_HTML_CHARS = 250000;

const DISALLOWED_HOSTNAMES = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
]);
const SOCIAL_HOST_SUFFIXES = ["facebook.com", "instagram.com", "fb.watch"];
const TRACKING_QUERY_KEYS = new Set([
    "fbclid",
    "gclid",
    "igshid",
    "mibextid",
    "share_app_id",
    "si",
]);

const collapseWhitespace = (value: string) =>
    value.replace(/\s+/g, " ").trim();

const decodeHtmlEntities = (value: string) =>
    value
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
            String.fromCodePoint(Number.parseInt(hex, 16)),
        )
        .replace(/&#(\d+);/g, (_, dec: string) =>
            String.fromCodePoint(Number.parseInt(dec, 10)),
        )
        .replace(/&nbsp;/gi, " ");

const sanitizeText = (value: string | undefined | null) => {
    if (!value) return undefined;
    const sanitized = collapseWhitespace(decodeHtmlEntities(value));
    return sanitized.length > 0 ? sanitized : undefined;
};

const isPrivateIPv4 = (hostname: string) => {
    const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return false;

    const octets = match.slice(1).map((value) => Number(value));
    if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
        return true;
    }

    if (octets[0] === 10) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
    return false;
};

const isDisallowedHost = (hostname: string) => {
    const normalized = hostname.toLowerCase();
    if (DISALLOWED_HOSTNAMES.has(normalized)) return true;
    if (normalized.endsWith(".local")) return true;
    if (isPrivateIPv4(normalized)) return true;
    return false;
};

const ATTRIBUTE_REGEX =
    /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/gi;

const parseTagAttributes = (tag: string) => {
    const attributes: Record<string, string> = {};
    let match: RegExpExecArray | null;

    ATTRIBUTE_REGEX.lastIndex = 0;

    while ((match = ATTRIBUTE_REGEX.exec(tag)) !== null) {
        const attributeName = match[1]?.toLowerCase();
        const rawValue = match[3] || match[4] || match[5] || "";
        if (!attributeName) continue;
        attributes[attributeName] = rawValue;
    }

    return attributes;
};

const extractMetaContent = (html: string, keys: string[]) => {
    const metaTagRegex = /<meta\b[^>]*>/gi;
    const metaTags = Array.from(html.matchAll(metaTagRegex)).map((match) =>
        parseTagAttributes(match[0]),
    );
    const normalizedKeys = keys.map((key) => key.toLowerCase());

    for (const key of normalizedKeys) {
        const tag = metaTags.find(
            (entry) =>
                (entry.property === key || entry.name === key) && !!entry.content,
        );
        if (!tag?.content) continue;

        const value = sanitizeText(tag.content);
        if (value) return value;
    }

    return undefined;
};

const extractLinkHref = (html: string, relValues: string[]) => {
    const linkTagRegex = /<link\b[^>]*>/gi;
    const linkTags = Array.from(html.matchAll(linkTagRegex)).map((match) =>
        parseTagAttributes(match[0]),
    );
    const normalizedRelValues = relValues.map((value) => value.toLowerCase());

    for (const expectedRel of normalizedRelValues) {
        const tag = linkTags.find((entry) => {
            const rel = entry.rel?.toLowerCase();
            return rel === expectedRel && !!entry.href;
        });

        if (!tag?.href) continue;

        const value = sanitizeText(tag.href);
        if (value) return value;
    }

    return undefined;
};

const extractTitle = (html: string) => {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return sanitizeText(titleMatch?.[1]);
};

const resolveImageUrl = (baseUrl: string, value: string | undefined) => {
    if (!value) return undefined;

    try {
        return new URL(value, baseUrl).toString();
    } catch {
        return undefined;
    }
};

type ExtractedMetadata = {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
};

const extractMetadataFromHtml = (html: string, baseUrl: string): ExtractedMetadata => {
    const title =
        extractMetaContent(html, ["og:title", "twitter:title"]) || extractTitle(html);
    const description = extractMetaContent(html, [
        "og:description",
        "description",
        "twitter:description",
    ]);
    const rawImage =
        extractMetaContent(html, [
            "og:image",
            "og:image:url",
            "og:image:secure_url",
            "twitter:image",
            "twitter:image:src",
        ]) || extractLinkHref(html, ["image_src", "thumbnail"]);
    const image = resolveImageUrl(baseUrl, rawImage);
    const siteName = extractMetaContent(html, ["og:site_name", "application-name"]);

    return {
        title,
        description,
        image,
        siteName,
    };
};

const metadataScore = (metadata: ExtractedMetadata) =>
    (metadata.title ? 1 : 0)
    + (metadata.description ? 1 : 0)
    + (metadata.image ? 2 : 0);

const isSocialHost = (hostname: string) => {
    const normalized = hostname.toLowerCase().replace(/^www\./, "");
    return SOCIAL_HOST_SUFFIXES.some(
        (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
    );
};

const withTrackingParamsRemoved = (input: URL) => {
    const next = new URL(input.toString());
    const keys = Array.from(next.searchParams.keys());
    let changed = false;

    for (const key of keys) {
        const normalized = key.toLowerCase();
        if (normalized.startsWith("utm_") || TRACKING_QUERY_KEYS.has(normalized)) {
            next.searchParams.delete(key);
            changed = true;
        }
    }

    if (!changed) return null;
    return next;
};

const withToggledTrailingSlash = (input: URL) => {
    const next = new URL(input.toString());
    if (next.pathname === "/") return null;

    if (next.pathname.endsWith("/")) {
        next.pathname = next.pathname.slice(0, -1);
    } else {
        next.pathname = `${next.pathname}/`;
    }

    return next;
};

const withDesktopFacebookHost = (input: URL) => {
    const normalizedHost = input.hostname.toLowerCase();
    if (normalizedHost !== "m.facebook.com") return null;

    const next = new URL(input.toString());
    next.hostname = "www.facebook.com";
    return next;
};

const withFacebookLoginNextUrl = (input: URL) => {
    const normalizedHost = input.hostname.toLowerCase();
    if (!normalizedHost.endsWith("facebook.com")) return null;
    if (!input.pathname.startsWith("/login")) return null;

    const nextValue = input.searchParams.get("next");
    if (!nextValue) return null;

    try {
        const decoded = decodeURIComponent(nextValue);
        const next = new URL(decoded, "https://www.facebook.com");
        if (next.hostname.toLowerCase() === "m.facebook.com") {
            next.hostname = "www.facebook.com";
        }
        return next;
    } catch {
        return null;
    }
};

const buildRetryUrls = (rawUrl: string, finalUrl: string) => {
    const candidates = new Set<string>();

    const addCandidate = (candidate: URL | null) => {
        if (!candidate) return;
        if (isDisallowedHost(candidate.hostname)) return;
        if (candidate.protocol !== "http:" && candidate.protocol !== "https:") return;
        candidates.add(candidate.toString());
    };

    try {
        const parsedRaw = new URL(rawUrl);
        addCandidate(withTrackingParamsRemoved(parsedRaw));
        addCandidate(withToggledTrailingSlash(parsedRaw));
        addCandidate(withDesktopFacebookHost(parsedRaw));
        addCandidate(withFacebookLoginNextUrl(parsedRaw));
    } catch {
        // No-op; raw URL has already been validated upstream.
    }

    try {
        const parsedFinal = new URL(finalUrl);
        addCandidate(withTrackingParamsRemoved(parsedFinal));
        addCandidate(withToggledTrailingSlash(parsedFinal));
        addCandidate(withDesktopFacebookHost(parsedFinal));
        addCandidate(withFacebookLoginNextUrl(parsedFinal));
    } catch {
        // No-op; final URL should be valid, but do not fail retries for this.
    }

    candidates.delete(finalUrl);
    return Array.from(candidates);
};

type FetchedHtmlPayload = {
    finalUrl: string;
    finalParsedUrl: URL;
    html?: string;
};

const fetchHtmlPayload = async (
    url: string,
    signal: AbortSignal,
): Promise<FetchedHtmlPayload> => {
    const response = await fetch(url, {
        redirect: "follow",
        signal,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (compatible; WorkdashLinkPreviewBot/1.0)",
        },
    });

    const finalUrl = response.url || url;
    const finalParsedUrl = new URL(finalUrl);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.includes("text/html")) {
        return { finalUrl, finalParsedUrl };
    }

    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    return { finalUrl, finalParsedUrl, html };
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<LinkPreviewPayload | { error: string }>,
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl) {
        return res.status(400).json({ error: "url is required" });
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        return res.status(400).json({ error: "url is invalid" });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).json({ error: "url protocol is invalid" });
    }
    if (isDisallowedHost(parsedUrl.hostname)) {
        return res.status(400).json({ error: "url host is not allowed" });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
        const primaryPayload = await fetchHtmlPayload(
            parsedUrl.toString(),
            controller.signal,
        );
        let resolvedUrl = primaryPayload.finalUrl;
        let resolvedParsedUrl = primaryPayload.finalParsedUrl;

        if (!primaryPayload.html) {
            return res.status(200).json({
                url: resolvedUrl,
                domain: resolvedParsedUrl.hostname.replace(/^www\./, ""),
            });
        }

        let metadata = extractMetadataFromHtml(primaryPayload.html, resolvedUrl);

        if (metadataScore(metadata) === 0 && isSocialHost(resolvedParsedUrl.hostname)) {
            const retryUrls = buildRetryUrls(parsedUrl.toString(), resolvedUrl);

            for (const retryUrl of retryUrls) {
                let retryPayload: FetchedHtmlPayload;
                try {
                    retryPayload = await fetchHtmlPayload(retryUrl, controller.signal);
                } catch {
                    continue;
                }

                if (!retryPayload.html) continue;

                const retryMetadata = extractMetadataFromHtml(
                    retryPayload.html,
                    retryPayload.finalUrl,
                );

                if (metadataScore(retryMetadata) > metadataScore(metadata)) {
                    metadata = retryMetadata;
                    resolvedUrl = retryPayload.finalUrl;
                    resolvedParsedUrl = retryPayload.finalParsedUrl;
                }

                if (metadataScore(metadata) >= 2) break;
            }
        }

        return res.status(200).json({
            url: resolvedUrl,
            domain: resolvedParsedUrl.hostname.replace(/^www\./, ""),
            title: metadata.title,
            description: metadata.description,
            image: metadata.image,
            siteName: metadata.siteName,
        });
    } catch {
        return res.status(200).json({
            url: parsedUrl.toString(),
            domain: parsedUrl.hostname.replace(/^www\./, ""),
        });
    } finally {
        clearTimeout(timeoutId);
    }
}
