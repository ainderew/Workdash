import { describe, expect, it } from 'vitest';
import { parseInlineMarkdown } from './inlineMarkdownParser';

describe('parseInlineMarkdown', () => {
  it('returns plain text for strings without formatting', () => {
    expect(parseInlineMarkdown('hello world')).toEqual([
      { type: 'text', content: 'hello world' },
    ]);
  });

  it('returns a single text token for empty string', () => {
    expect(parseInlineMarkdown('')).toEqual([]);
  });

  it('parses **bold** text', () => {
    expect(parseInlineMarkdown('before **bold** after')).toEqual([
      { type: 'text', content: 'before ' },
      { type: 'bold', content: 'bold' },
      { type: 'text', content: ' after' },
    ]);
  });

  it('parses *italic* text', () => {
    expect(parseInlineMarkdown('before *italic* after')).toEqual([
      { type: 'text', content: 'before ' },
      { type: 'italic', content: 'italic' },
      { type: 'text', content: ' after' },
    ]);
  });

  it('parses __underline__ text', () => {
    expect(parseInlineMarkdown('before __underline__ after')).toEqual([
      { type: 'text', content: 'before ' },
      { type: 'underline', content: 'underline' },
      { type: 'text', content: ' after' },
    ]);
  });

  it('parses [text](url) hyperlinks', () => {
    expect(parseInlineMarkdown('click [here](https://example.com) now')).toEqual([
      { type: 'text', content: 'click ' },
      { type: 'hyperlink', text: 'here', url: 'https://example.com' },
      { type: 'text', content: ' now' },
    ]);
  });

  it('parses ** before * to avoid ambiguity', () => {
    const result = parseInlineMarkdown('**bold** and *italic*');
    expect(result).toEqual([
      { type: 'bold', content: 'bold' },
      { type: 'text', content: ' and ' },
      { type: 'italic', content: 'italic' },
    ]);
  });

  it('handles multiple formatting tokens in sequence', () => {
    const result = parseInlineMarkdown('**bold** *italic* __underline__');
    expect(result).toEqual([
      { type: 'bold', content: 'bold' },
      { type: 'text', content: ' ' },
      { type: 'italic', content: 'italic' },
      { type: 'text', content: ' ' },
      { type: 'underline', content: 'underline' },
    ]);
  });

  it('parses hyperlink before bare URL text', () => {
    const result = parseInlineMarkdown('[Google](https://google.com)');
    expect(result).toEqual([
      { type: 'hyperlink', text: 'Google', url: 'https://google.com' },
    ]);
  });

  it('handles bold text at the start of string', () => {
    expect(parseInlineMarkdown('**start** rest')).toEqual([
      { type: 'bold', content: 'start' },
      { type: 'text', content: ' rest' },
    ]);
  });

  it('handles formatting at the end of string', () => {
    expect(parseInlineMarkdown('text **end**')).toEqual([
      { type: 'text', content: 'text ' },
      { type: 'bold', content: 'end' },
    ]);
  });

  it('does not match single asterisks inside bold', () => {
    // **text** should match as bold, not italic
    const result = parseInlineMarkdown('**hello world**');
    expect(result).toEqual([{ type: 'bold', content: 'hello world' }]);
  });

  it('handles hyperlink with path and query params', () => {
    const result = parseInlineMarkdown('[docs](https://example.com/path?q=1&b=2)');
    expect(result).toEqual([
      { type: 'hyperlink', text: 'docs', url: 'https://example.com/path?q=1&b=2' },
    ]);
  });
});
