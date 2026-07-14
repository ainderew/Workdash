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

    it("renders a Linear rich card from the issue key even without metadata", () => {
        const { getByRole, getByText } = render(
            <UnifiedLinkPreview
                url="https://linear.app/workdash/issue/WD-142/fix-login-flow"
                platform="linear"
                metadata={null}
                platformHints={{ linearKey: "WD-142" }}
            />,
        );
        const link = getByRole("link");
        expect(link).toHaveAttribute(
            "href",
            "https://linear.app/workdash/issue/WD-142/fix-login-flow",
        );
        expect(getByText("WD-142")).toBeInTheDocument();
        expect(getByText("Issue")).toBeInTheDocument();
        expect(getByText("Linear")).toBeInTheDocument();
    });

    it("uppercases the Linear key and shows scraped title/description", () => {
        const { getByText } = render(
            <UnifiedLinkPreview
                url="https://linear.app/acme/issue/eng-33/some-slug"
                platform="linear"
                metadata={{
                    url: "https://linear.app/acme/issue/eng-33/some-slug",
                    title: "Fix login flow",
                    description: "Users get stuck on the OTP step",
                }}
                platformHints={{ linearKey: "eng-33" }}
            />,
        );
        expect(getByText("ENG-33")).toBeInTheDocument();
        expect(getByText("Fix login flow")).toBeInTheDocument();
        expect(
            getByText("Users get stuck on the OTP step"),
        ).toBeInTheDocument();
    });

    it("renders nothing for a Linear platform link missing an issue key", () => {
        const { container } = render(
            <UnifiedLinkPreview
                url="https://linear.app/workdash/team/WD/active"
                platform="linear"
                metadata={null}
            />,
        );
        expect(container).toBeEmptyDOMElement();
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
