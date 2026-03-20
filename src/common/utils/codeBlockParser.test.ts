import { describe, it, expect } from 'vitest';
import { parseCodeBlocks } from './codeBlockParser';

describe('parseCodeBlocks', () => {
  it('returns single text segment for plain text', () => {
    const result = parseCodeBlocks('Hello world');
    expect(result).toEqual([{ type: 'text', content: 'Hello world' }]);
  });

  it('parses a fenced code block with language', () => {
    const input = '```typescript\nconst x = 1;\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: 'typescript', code: 'const x = 1;\n' },
    ]);
  });

  it('parses a fenced code block without language', () => {
    const input = '```\nsome code\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: '', code: 'some code\n' },
    ]);
  });

  it('parses inline code', () => {
    const input = 'Use `npm install` to install';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: 'Use ' },
      { type: 'inline_code', code: 'npm install' },
      { type: 'text', content: ' to install' },
    ]);
  });

  it('parses mixed content: text, fenced block, inline code', () => {
    const input = 'Hello\n```js\nconst a = 1;\n```\nUse `foo` here';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: 'Hello\n' },
      { type: 'code_block', language: 'js', code: 'const a = 1;\n' },
      { type: 'text', content: '\nUse ' },
      { type: 'inline_code', code: 'foo' },
      { type: 'text', content: ' here' },
    ]);
  });

  it('treats unclosed fences as literal text', () => {
    const input = '```js\nsome code without closing';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: '```js\nsome code without closing' },
    ]);
  });

  it('handles empty code block', () => {
    const input = '```\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: '', code: '' },
    ]);
  });

  it('does not match inline code with newlines', () => {
    const input = '`line1\nline2`';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: '`line1\nline2`' },
    ]);
  });

  it('does not match single backtick in contractions', () => {
    const input = "it's a test";
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: "it's a test" },
    ]);
  });

  it('preserves backticks inside fenced blocks', () => {
    const input = '```\nconst x = `hello`;\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: '', code: 'const x = `hello`;\n' },
    ]);
  });

  it('handles multiple fenced blocks', () => {
    const input = '```js\na\n```\ntext\n```py\nb\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: 'js', code: 'a\n' },
      { type: 'text', content: '\ntext\n' },
      { type: 'code_block', language: 'py', code: 'b\n' },
    ]);
  });

  it('handles multiple inline codes', () => {
    const input = 'Use `foo` and `bar` here';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: 'Use ' },
      { type: 'inline_code', code: 'foo' },
      { type: 'text', content: ' and ' },
      { type: 'inline_code', code: 'bar' },
      { type: 'text', content: ' here' },
    ]);
  });

  it('does not match empty inline backticks', () => {
    const input = 'nothing `` here';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: 'nothing `` here' },
    ]);
  });

  it('handles content with URLs inside code blocks', () => {
    const input = '```\nhttps://example.com\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: '', code: 'https://example.com\n' },
    ]);
  });

  it('handles content with mentions inside inline code', () => {
    const input = 'Use `@mention` syntax';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: 'Use ' },
      { type: 'inline_code', code: '@mention' },
      { type: 'text', content: ' syntax' },
    ]);
  });

  it('returns empty array for empty string', () => {
    const result = parseCodeBlocks('');
    expect(result).toEqual([]);
  });

  it('treats closing fence on same line as code as plain text', () => {
    const input = '```js\nconst x = 1;```';
    const result = parseCodeBlocks(input);
    // Closing fence must be on its own line to be recognized
    expect(result).toEqual([
      { type: 'text', content: '```js\nconst x = 1;```' },
    ]);
  });

  it('treats multiline block with closing fence on last code line as plain text', () => {
    const input = '```ts\nfunction foo() {\n  return 1;\n}```';
    const result = parseCodeBlocks(input);
    // Closing fence must be on its own line to be recognized
    expect(result).toEqual([
      { type: 'text', content: '```ts\nfunction foo() {\n  return 1;\n}```' },
    ]);
  });

  it('keeps markdown link syntax inside code block as code', () => {
    const input = '```\n[click here](https://example.com)\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: '', code: '[click here](https://example.com)\n' },
    ]);
  });

  it('keeps bold/italic markdown inside code block as code', () => {
    const input = '```\n**bold** and *italic*\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: '', code: '**bold** and *italic*\n' },
    ]);
  });

  it('code block as first content in message (no preceding newline)', () => {
    const input = '```js\nconst x = 1;\n```';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'code_block', language: 'js', code: 'const x = 1;\n' },
    ]);
  });

  it('separates URLs in code blocks from URLs in text segments', () => {
    const input =
      'Check https://real-link.com\n```\nhttps://code-url.com\n```\nAlso https://another-link.com';
    const result = parseCodeBlocks(input);
    expect(result).toEqual([
      { type: 'text', content: 'Check https://real-link.com\n' },
      { type: 'code_block', language: '', code: 'https://code-url.com\n' },
      { type: 'text', content: '\nAlso https://another-link.com' },
    ]);

    const textSegments = result.filter((s) => s.type === 'text');
    const codeSegments = result.filter((s) => s.type === 'code_block');
    expect(textSegments).toHaveLength(2);
    expect(codeSegments).toHaveLength(1);
  });

  it('handles code block immediately after inline text on same line', () => {
    const input = 'some text```\ncode\n```';
    const result = parseCodeBlocks(input);
    // The fenced regex requires ``` at start of line, so this won't match as a code block
    expect(result).toEqual([
      { type: 'text', content: 'some text```\ncode\n```' },
    ]);
  });
});
