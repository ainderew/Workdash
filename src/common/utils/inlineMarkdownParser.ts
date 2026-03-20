export type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'underline'; content: string }
  | { type: 'hyperlink'; text: string; url: string };

/**
 * Single-pass tokenizer for inline markdown formatting.
 * Parse order: `[text](url)` → `**bold**` → `*italic*` → `__underline__`
 * Does NOT handle code blocks — those should be extracted before calling this.
 */
export function parseInlineMarkdown(text: string): InlineToken[] {
  if (!text) return [];

  // Combined regex: hyperlink | bold | underline | italic
  // Order matters: ** before *, __ before _
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;

  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // [text](url)
      tokens.push({ type: 'hyperlink', text: match[1], url: match[2] });
    } else if (match[3] !== undefined) {
      // **bold**
      tokens.push({ type: 'bold', content: match[3] });
    } else if (match[4] !== undefined) {
      // __underline__
      tokens.push({ type: 'underline', content: match[4] });
    } else if (match[5] !== undefined) {
      // *italic*
      tokens.push({ type: 'italic', content: match[5] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Push trailing plain text
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: text }];
}
