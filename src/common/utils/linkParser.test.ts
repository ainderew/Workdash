import { describe, expect, it } from 'vitest';
import { stripMarkdownLinkSpans } from './linkParser';

describe('stripMarkdownLinkSpans', () => {
    it('replaces a markdown hyperlink with just its display text', () => {
        expect(stripMarkdownLinkSpans('[click](https://example.com)')).toBe(
            'click',
        );
    });

    it('leaves bare URLs untouched', () => {
        const input = 'visit https://example.com for info';
        expect(stripMarkdownLinkSpans(input)).toBe(input);
    });

    it('strips multiple spans and preserves surrounding prose', () => {
        const input =
            'See the [Help Center](https://links.email.claude.com/abc) ' +
            'or the [docs](https://docs.example.com) for details.';
        expect(stripMarkdownLinkSpans(input)).toBe(
            'See the Help Center or the docs for details.',
        );
    });

    it('does not match malformed bracket-paren patterns', () => {
        expect(stripMarkdownLinkSpans('[text] (https://x.com)')).toBe(
            '[text] (https://x.com)',
        );
        expect(stripMarkdownLinkSpans('[text](not-a-url)')).toBe(
            '[text](not-a-url)',
        );
    });
});
