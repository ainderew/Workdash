import type { JSONContent } from '@tiptap/react';

/**
 * Serializes a Tiptap JSON document to markdown-like storage format.
 *
 * Mapping:
 *   bold mark      → **text**
 *   italic mark    → *text*
 *   underline mark → __text__
 *   link mark      → [text](url) (bare URL if text === url)
 *   bulletList     → - item\n- item
 *   code mark      → `code`
 *   codeBlock node → ```lang\ncode\n```
 *   hardBreak      → \n
 *   mention node   → @DisplayName
 */
export function serializeTiptapToMarkdown(doc: JSONContent): string {
  if (!doc.content) return '';
  return serializeNodes(doc.content).replace(/\n+$/, '');
}

function serializeNodes(nodes: JSONContent[]): string {
  const merged: JSONContent[] = [];

  for (const node of nodes) {
    const prev = merged[merged.length - 1];
    // Merge consecutive codeBlock nodes into a single node
    if (
      node.type === 'codeBlock' &&
      prev?.type === 'codeBlock'
    ) {
      const prevText = prev.content
        ? prev.content.map((n) => n.text ?? '').join('')
        : '';
      const curText = node.content
        ? node.content.map((n) => n.text ?? '').join('')
        : '';
      prev.content = [{ type: 'text', text: prevText + '\n' + curText }];
      // Keep the language from whichever has one
      if (!prev.attrs?.language && node.attrs?.language) {
        prev.attrs = { ...prev.attrs, language: node.attrs.language };
      }
      continue;
    }
    merged.push(node);
  }

  return merged.map(serializeNode).join('');
}

function serializeNode(node: JSONContent): string {
  switch (node.type) {
    case 'paragraph':
      return serializeParagraphContent(node) + '\n';

    case 'bulletList':
      return serializeBulletList(node);

    case 'listItem':
      return serializeListItem(node);

    case 'codeBlock': {
      const lang = node.attrs?.language || '';
      const code = node.content
        ? node.content.map((n) => n.text ?? '').join('')
        : '';
      return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
    }

    case 'hardBreak':
      return '\n';

    case 'text':
      return serializeTextNode(node);

    case 'mention':
      return `@${node.attrs?.label ?? node.attrs?.id ?? ''}`;

    default:
      // For unknown nodes, try to serialize their content
      if (node.content) return serializeNodes(node.content);
      return node.text ?? '';
  }
}

function serializeParagraphContent(node: JSONContent): string {
  if (!node.content) return '';
  return node.content.map(serializeNode).join('');
}

function serializeBulletList(node: JSONContent): string {
  if (!node.content) return '';
  return node.content.map(serializeNode).join('');
}

function serializeListItem(node: JSONContent): string {
  if (!node.content) return '';
  // List items contain paragraphs — serialize inline content only
  const inner = node.content
    .map((child) => {
      if (child.type === 'paragraph') return serializeParagraphContent(child);
      return serializeNode(child);
    })
    .join('');
  return `- ${inner}\n`;
}

function serializeTextNode(node: JSONContent): string {
  let text = node.text ?? '';
  if (!node.marks || node.marks.length === 0) return text;

  // Apply marks inside-out: code first, then structural marks, then link
  const hasCode = node.marks.some((m) => m.type === 'code');
  if (hasCode) return `\`${text}\``;

  const hasLink = node.marks.find((m) => m.type === 'link');
  const hasBold = node.marks.some((m) => m.type === 'bold');
  const hasItalic = node.marks.some((m) => m.type === 'italic');
  const hasUnderline = node.marks.some((m) => m.type === 'underline');

  if (hasBold) text = `**${text}**`;
  if (hasItalic) text = `*${text}*`;
  if (hasUnderline) text = `__${text}__`;

  if (hasLink) {
    const href = hasLink.attrs?.href ?? '';
    if (text === href) {
      // Bare URL — no wrapping needed, linkParser will handle display
      return text;
    }
    // Strip any markdown wrapping that was just applied to go inside []
    const innerText = node.text ?? '';
    let inner = innerText;
    if (hasBold) inner = `**${inner}**`;
    if (hasItalic) inner = `*${inner}*`;
    if (hasUnderline) inner = `__${inner}__`;
    return `[${inner}](${href})`;
  }

  return text;
}

/**
 * Deserializes markdown-like storage format into a Tiptap JSON document.
 * Used when entering edit mode for an existing message.
 */
export function deserializeMarkdownToTiptap(markdown: string): JSONContent {
  const lines = markdown.split('\n');
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    // Code block detection
    if (lines[i].startsWith('```')) {
      const langMatch = lines[i].match(/^```(\w*)$/);
      const lang = langMatch?.[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      content.push({
        type: 'codeBlock',
        attrs: { language: lang },
        content: codeLines.length > 0
          ? [{ type: 'text', text: codeLines.join('\n') }]
          : undefined,
      });
      continue;
    }

    // Bullet list detection — collect consecutive "- " lines
    if (lines[i].startsWith('- ')) {
      const listItems: JSONContent[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        const itemText = lines[i].slice(2);
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: deserializeInlineContent(itemText),
          }],
        });
        i++;
      }
      content.push({
        type: 'bulletList',
        content: listItems,
      });
      continue;
    }

    // Empty line → empty paragraph
    if (lines[i] === '') {
      // Skip consecutive empty lines, just add one empty paragraph
      if (content.length > 0) {
        content.push({ type: 'paragraph' });
      }
      i++;
      continue;
    }

    // Regular paragraph
    content.push({
      type: 'paragraph',
      content: deserializeInlineContent(lines[i]),
    });
    i++;
  }

  // Ensure at least one paragraph
  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return { type: 'doc', content };
}

/**
 * Deserializes inline markdown tokens into Tiptap inline content nodes.
 */
function deserializeInlineContent(text: string): JSONContent[] {
  if (!text) return [];

  const nodes: JSONContent[] = [];

  // Combined regex matching code spans, hyperlinks, bold, underline, italic
  const pattern =
    /`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // `code`
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'code' }] });
    } else if (match[2] !== undefined && match[3] !== undefined) {
      // [text](url)
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'link', attrs: { href: match[3], target: '_blank' } }],
      });
    } else if (match[4] !== undefined) {
      // **bold**
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'bold' }] });
    } else if (match[5] !== undefined) {
      // __underline__
      nodes.push({ type: 'text', text: match[5], marks: [{ type: 'underline' }] });
    } else if (match[6] !== undefined) {
      // *italic*
      nodes.push({ type: 'text', text: match[6], marks: [{ type: 'italic' }] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Push trailing plain text
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return nodes;
}
