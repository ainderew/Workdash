import React from "react";
import type { LinkPreviewMetadata } from "@/common/hooks/useLinkPreviews";
import { getPlatformIcon } from "./platformIcons";

export type RichProvider = "github" | "jira" | "linear";

export interface RichLinkRef {
    provider: RichProvider;
    /** e.g. "vercel/next.js" or "WD-142" */
    identifier: string;
    /** e.g. "PR #1234", "Issue #88", "Repo" */
    badge?: string;
}

interface RichLinkCardProps {
    url: string;
    reference: RichLinkRef;
    metadata: LinkPreviewMetadata | null | undefined;
}

const PROVIDER_LABEL: Record<RichProvider, string> = {
    github: "GitHub",
    jira: "Jira",
    linear: "Linear",
};

/**
 * Text-first unfurl for code/issue-tracker links. Renders from the identifier
 * parsed out of the URL (owner/repo, issue key) plus whatever OG metadata the
 * scraper returned — so a card shows even when the title is unavailable (common
 * for private Jira/Linear issues behind auth).
 */
export function RichLinkCard({ url, reference, metadata }: RichLinkCardProps) {
    const Icon = getPlatformIcon(reference.provider);
    const displayUrl = metadata?.url || url;
    const title = metadata?.title;
    const description = metadata?.description;
    const hasBody = !!title || !!description;

    return (
        <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block max-w-md overflow-hidden rounded-xl border wd-border-subtle wd-bg-elevated transition-colors duration-150 motion-reduce:transition-none hover:bg-[var(--wd-surface-base)] hover:wd-border-strong"
        >
            <div
                className={`flex items-center gap-2 px-3 py-2 ${
                    hasBody ? "border-b wd-border-subtle" : ""
                }`}
            >
                <Icon size={15} />
                <span className="truncate text-xs font-semibold wd-text-primary">
                    {reference.identifier}
                </span>
                {reference.badge && (
                    <span className="shrink-0 rounded-md border wd-border-subtle px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide wd-text-muted">
                        {reference.badge}
                    </span>
                )}
                <span className="ml-auto shrink-0 text-[11px] wd-text-muted">
                    {PROVIDER_LABEL[reference.provider]}
                </span>
            </div>
            {hasBody && (
                <div className="px-3 py-2">
                    {title && (
                        <p className="line-clamp-2 text-sm font-medium wd-text-primary">
                            {title}
                        </p>
                    )}
                    {description && (
                        <p className="mt-0.5 line-clamp-2 text-xs wd-text-secondary">
                            {description}
                        </p>
                    )}
                </div>
            )}
        </a>
    );
}
