import { describe, expect, it } from 'vitest';
import { parseMessageContent, stripMarkdownLinkSpans } from './linkParser';

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

describe('parseMessageContent — Linear issue links', () => {
    it('detects a Linear issue link with a slug and extracts the key', () => {
        const url = 'https://linear.app/workdash/issue/WD-142/fix-login-flow';
        const parts = parseMessageContent(`check this ${url}`);

        expect(parts).toEqual([
            { type: 'text', content: 'check this ' },
            { type: 'linear', content: url, url, linearKey: 'WD-142' },
        ]);
    });

    it('detects a Linear issue link without a slug', () => {
        const url = 'https://linear.app/workdash/issue/ENG-7';
        const parts = parseMessageContent(url);

        expect(parts).toHaveLength(1);
        expect(parts[0]).toMatchObject({ type: 'linear', linearKey: 'ENG-7' });
    });

    it('extracts a lowercase key as written (display layer uppercases)', () => {
        const url = 'https://linear.app/acme/issue/eng-33/some-slug';
        const parts = parseMessageContent(url);

        expect(parts[0]).toMatchObject({ type: 'linear', linearKey: 'eng-33' });
    });

    it('treats non-issue Linear pages as plain links', () => {
        const url = 'https://linear.app/workdash/team/WD/active';
        const parts = parseMessageContent(url);

        expect(parts[0]).toMatchObject({ type: 'link', url });
    });

    it('parses multiple Linear links in one message', () => {
        const a = 'https://linear.app/acme/issue/ENG-1/first';
        const b = 'https://linear.app/acme/issue/ENG-2/second';
        const parts = parseMessageContent(`${a} and ${b}`);

        const linearParts = parts.filter((p) => p.type === 'linear');
        expect(linearParts.map((p) => p.linearKey)).toEqual(['ENG-1', 'ENG-2']);
    });
});

describe('parseMessageContent — Jira issue links', () => {
    it('detects a Jira cloud browse link and extracts the key', () => {
        const url = 'https://acme.atlassian.net/browse/PROJ-123';
        const parts = parseMessageContent(url);

        expect(parts[0]).toMatchObject({ type: 'jira', jiraKey: 'PROJ-123' });
    });
});
