import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/react';
import {
  serializeTiptapToMarkdown,
  deserializeMarkdownToTiptap,
} from './richTextSerializer';

/** Helper to create a minimal Tiptap doc with a single paragraph */
function doc(...content: JSONContent[]): JSONContent {
  return { type: 'doc', content };
}

function paragraph(...content: JSONContent[]): JSONContent {
  return { type: 'paragraph', content };
}

function text(t: string, marks?: JSONContent['marks']): JSONContent {
  return marks ? { type: 'text', text: t, marks } : { type: 'text', text: t };
}

describe('serializeTiptapToMarkdown', () => {
  it('serializes plain text', () => {
    const input = doc(paragraph(text('hello world')));
    expect(serializeTiptapToMarkdown(input)).toBe('hello world');
  });

  it('serializes bold text', () => {
    const input = doc(
      paragraph(
        text('before '),
        text('bold', [{ type: 'bold' }]),
        text(' after'),
      ),
    );
    expect(serializeTiptapToMarkdown(input)).toBe('before **bold** after');
  });

  it('serializes italic text', () => {
    const input = doc(
      paragraph(text('hello ', undefined), text('world', [{ type: 'italic' }])),
    );
    expect(serializeTiptapToMarkdown(input)).toBe('hello *world*');
  });

  it('serializes underline text', () => {
    const input = doc(
      paragraph(text('hello '), text('underlined', [{ type: 'underline' }])),
    );
    expect(serializeTiptapToMarkdown(input)).toBe('hello __underlined__');
  });

  it('serializes inline code', () => {
    const input = doc(
      paragraph(text('use '), text('foo()', [{ type: 'code' }]), text(' here')),
    );
    expect(serializeTiptapToMarkdown(input)).toBe('use `foo()` here');
  });

  it('serializes hyperlinks with display text', () => {
    const input = doc(
      paragraph(
        text('click '),
        text('here', [{ type: 'link', attrs: { href: 'https://example.com' } }]),
      ),
    );
    expect(serializeTiptapToMarkdown(input)).toBe(
      'click [here](https://example.com)',
    );
  });

  it('serializes bare URL links (text === url)', () => {
    const url = 'https://example.com';
    const input = doc(
      paragraph(
        text(url, [{ type: 'link', attrs: { href: url } }]),
      ),
    );
    expect(serializeTiptapToMarkdown(input)).toBe(url);
  });

  it('serializes bullet lists', () => {
    const input = doc({
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [paragraph(text('first'))],
        },
        {
          type: 'listItem',
          content: [paragraph(text('second'))],
        },
      ],
    });
    expect(serializeTiptapToMarkdown(input)).toBe('- first\n- second');
  });

  it('serializes code blocks', () => {
    const input = doc({
      type: 'codeBlock',
      attrs: { language: 'js' },
      content: [text('const x = 1;')],
    });
    expect(serializeTiptapToMarkdown(input)).toBe('```js\nconst x = 1;\n```');
  });

  it('serializes multiple paragraphs', () => {
    const input = doc(
      paragraph(text('line one')),
      paragraph(text('line two')),
    );
    expect(serializeTiptapToMarkdown(input)).toBe('line one\nline two');
  });

  it('serializes hard breaks', () => {
    const input = doc(
      paragraph(text('before'), { type: 'hardBreak' }, text('after')),
    );
    expect(serializeTiptapToMarkdown(input)).toBe('before\nafter');
  });

  it('serializes mention nodes', () => {
    const input = doc(
      paragraph(
        text('hey '),
        { type: 'mention', attrs: { id: '42', label: 'John' } },
        text(' check this'),
      ),
    );
    expect(serializeTiptapToMarkdown(input)).toBe('hey @John check this');
  });

  it('handles empty document', () => {
    expect(serializeTiptapToMarkdown({ type: 'doc' })).toBe('');
  });
});

describe('deserializeMarkdownToTiptap', () => {
  it('deserializes plain text', () => {
    const result = deserializeMarkdownToTiptap('hello world');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
    expect(result.content![0].content![0].text).toBe('hello world');
  });

  it('deserializes **bold**', () => {
    const result = deserializeMarkdownToTiptap('**bold**');
    const inline = result.content![0].content!;
    expect(inline).toHaveLength(1);
    expect(inline[0].text).toBe('bold');
    expect(inline[0].marks).toEqual([{ type: 'bold' }]);
  });

  it('deserializes *italic*', () => {
    const result = deserializeMarkdownToTiptap('*italic*');
    const inline = result.content![0].content!;
    expect(inline).toHaveLength(1);
    expect(inline[0].text).toBe('italic');
    expect(inline[0].marks).toEqual([{ type: 'italic' }]);
  });

  it('deserializes __underline__', () => {
    const result = deserializeMarkdownToTiptap('__underlined__');
    const inline = result.content![0].content!;
    expect(inline).toHaveLength(1);
    expect(inline[0].text).toBe('underlined');
    expect(inline[0].marks).toEqual([{ type: 'underline' }]);
  });

  it('deserializes `inline code`', () => {
    const result = deserializeMarkdownToTiptap('use `foo()` here');
    const inline = result.content![0].content!;
    expect(inline).toHaveLength(3);
    expect(inline[0].text).toBe('use ');
    expect(inline[1].text).toBe('foo()');
    expect(inline[1].marks).toEqual([{ type: 'code' }]);
    expect(inline[2].text).toBe(' here');
  });

  it('deserializes [text](url)', () => {
    const result = deserializeMarkdownToTiptap('[click](https://example.com)');
    const inline = result.content![0].content!;
    expect(inline).toHaveLength(1);
    expect(inline[0].text).toBe('click');
    expect(inline[0].marks).toEqual([
      { type: 'link', attrs: { href: 'https://example.com', target: '_blank' } },
    ]);
  });

  it('deserializes bullet lists', () => {
    const result = deserializeMarkdownToTiptap('- first\n- second');
    expect(result.content).toHaveLength(1);
    const list = result.content![0];
    expect(list.type).toBe('bulletList');
    expect(list.content).toHaveLength(2);
    expect(list.content![0].type).toBe('listItem');
  });

  it('deserializes code blocks', () => {
    const result = deserializeMarkdownToTiptap('```js\nconst x = 1;\n```');
    expect(result.content).toHaveLength(1);
    const block = result.content![0];
    expect(block.type).toBe('codeBlock');
    expect(block.attrs?.language).toBe('js');
    expect(block.content![0].text).toBe('const x = 1;');
  });

  it('handles empty string', () => {
    const result = deserializeMarkdownToTiptap('');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
  });
});

describe('round-trip serialization', () => {
  const roundTrip = (md: string) =>
    serializeTiptapToMarkdown(deserializeMarkdownToTiptap(md));

  it('round-trips plain text', () => {
    expect(roundTrip('hello world')).toBe('hello world');
  });

  it('round-trips **bold**', () => {
    expect(roundTrip('before **bold** after')).toBe('before **bold** after');
  });

  it('round-trips *italic*', () => {
    expect(roundTrip('before *italic* after')).toBe('before *italic* after');
  });

  it('round-trips __underline__', () => {
    expect(roundTrip('before __underline__ after')).toBe(
      'before __underline__ after',
    );
  });

  it('round-trips `code`', () => {
    expect(roundTrip('use `code` here')).toBe('use `code` here');
  });

  it('round-trips [text](url)', () => {
    expect(roundTrip('[click](https://example.com)')).toBe(
      '[click](https://example.com)',
    );
  });

  it('round-trips bullet lists', () => {
    expect(roundTrip('- first\n- second')).toBe('- first\n- second');
  });

  it('round-trips code blocks', () => {
    expect(roundTrip('```js\nconst x = 1;\n```')).toBe(
      '```js\nconst x = 1;\n```',
    );
  });
});
