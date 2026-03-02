import {
  CHAT_REACTION_EMOJI_CATALOG,
  isSupportedReactionEmoji,
} from './reactionCatalog';

describe('isSupportedReactionEmoji', () => {
  it('returns true for emojis in the catalog', () => {
    expect(isSupportedReactionEmoji('😂')).toBe(true);
    expect(isSupportedReactionEmoji('🔥')).toBe(true);
    expect(isSupportedReactionEmoji('🚀')).toBe(true);
  });

  it('returns false for emojis and strings not in the catalog', () => {
    expect(isSupportedReactionEmoji('🦄')).toBe(false);
    expect(isSupportedReactionEmoji('abc')).toBe(false);
    expect(isSupportedReactionEmoji('')).toBe(false);
  });
});

describe('CHAT_REACTION_EMOJI_CATALOG', () => {
  it('contains 16 entries with no duplicates', () => {
    expect(CHAT_REACTION_EMOJI_CATALOG).toHaveLength(16);

    const unique = new Set(CHAT_REACTION_EMOJI_CATALOG);
    expect(unique.size).toBe(CHAT_REACTION_EMOJI_CATALOG.length);
  });
});
