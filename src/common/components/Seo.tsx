import React from "react";
import Head from "next/head";
import {
    OG_IMAGE,
    OG_IMAGE_ALT,
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_URL,
} from "@/common/config/site";

interface SeoProps {
    /** Full <title>. Falls back to the site name. */
    title?: string;
    description?: string;
    /** Path with a leading slash, e.g. "/terms". Sets the canonical URL. */
    path?: string;
    image?: string;
    imageAlt?: string;
    /** Screens behind auth, one-time links and invites should stay out of search. */
    noindex?: boolean;
}

export function Seo({
    title,
    description = SITE_DESCRIPTION,
    path = "/",
    image = OG_IMAGE,
    imageAlt = OG_IMAGE_ALT,
    noindex = false,
}: SeoProps) {
    const pageTitle = title ?? SITE_NAME;
    const url = `${SITE_URL}${path}`;
    const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

    return (
        <Head>
            <title>{pageTitle}</title>
            <meta name="description" content={description} />
            {/* Both www and apex resolve, so every page names its own canonical. */}
            <link rel="canonical" href={url} />
            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow, max-image-preview:large" />
            )}

            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:locale" content="en_US" />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={imageAlt} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrl} />
            <meta name="twitter:image:alt" content={imageAlt} />
        </Head>
    );
}
