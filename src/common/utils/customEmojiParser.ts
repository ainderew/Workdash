/**
 * Regex to match custom emoji tokens in message content.
 * Format: <:name:uuid>
 */
const CUSTOM_EMOJI_REGEX = /<:([a-z0-9_]{2,32}):([0-9a-f-]{36})>/g;

export interface CustomEmojiToken {
  type: 'text' | 'custom_emoji';
  content: string;
  emojiId?: string;
  emojiName?: string;
}

/**
 * Parses a text string and splits it into text segments and custom emoji tokens.
 */
export function parseCustomEmojis(text: string): CustomEmojiToken[] {
  const tokens: CustomEmojiToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CUSTOM_EMOJI_REGEX)) {
    const matchIndex = match.index;

    // Add text before this match
    if (matchIndex > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, matchIndex) });
    }

    tokens.push({
      type: 'custom_emoji',
      content: match[0],
      emojiName: match[1],
      emojiId: match[2],
    });

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: text }];
}

/**
 * Check if a string is a custom emoji token (for reactions).
 */
export function isCustomEmojiToken(str: string): boolean {
  return /^<:[a-z0-9_]{2,32}:[0-9a-f-]{36}>$/.test(str);
}

/**
 * Extract name and id from a custom emoji token.
 */
export function parseCustomEmojiToken(str: string): { name: string; id: string } | null {
  const match = str.match(/^<:([a-z0-9_]{2,32}):([0-9a-f-]{36})>$/);
  if (!match) return null;
  return { name: match[1], id: match[2] };
}
