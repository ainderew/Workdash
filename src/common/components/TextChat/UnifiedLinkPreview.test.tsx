import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { UnifiedLinkPreview } from "./UnifiedLinkPreview";

describe("UnifiedLinkPreview", () => {
    it("returns null when metadata is weak (no title/description/image)", () => {
        const { container } = render(
            <UnifiedLinkPreview
                url="https://links.email.claude.com/abc"
                platform="generic"
                metadata={{
                    url: "https://links.email.claude.com/abc",
                    domain: "links.email.claude.com",
                }}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("returns null when metadata is null (preview fetch failed)", () => {
        const { container } = render(
            <UnifiedLinkPreview
                url="https://x.test/abc"
                platform="generic"
                metadata={null}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renders a card when metadata has a title", () => {
        const { container, getByText } = render(
            <UnifiedLinkPreview
                url="https://example.com"
                platform="generic"
                metadata={{
                    url: "https://example.com",
                    domain: "example.com",
                    title: "Example Domain",
                }}
            />,
        );
        expect(container).not.toBeEmptyDOMElement();
        expect(getByText("Example Domain")).toBeInTheDocument();
    });

    it("still renders for YouTube even with weak metadata (thumbnail fallback)", () => {
        const { container } = render(
            <UnifiedLinkPreview
                url="https://youtu.be/dQw4w9WgXcQ"
                platform="youtube"
                metadata={null}
                platformHints={{ youtubeId: "dQw4w9WgXcQ" }}
            />,
        );
        expect(container).not.toBeEmptyDOMElement();
    });
});
