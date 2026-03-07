import { isSupportedReactionEmoji } from './reactionCatalog';

describe('isSupportedReactionEmoji', () => {
  it('accepts standard emoji', () => {
    expect(isSupportedReactionEmoji('😂')).toBe(true);
    expect(isSupportedReactionEmoji('🔥')).toBe(true);
    expect(isSupportedReactionEmoji('🚀')).toBe(true);
    expect(isSupportedReactionEmoji('👍')).toBe(true);
  });

  it('accepts emoji that were previously outside the catalog', () => {
    expect(isSupportedReactionEmoji('🦄')).toBe(true);
    expect(isSupportedReactionEmoji('🐶')).toBe(true);
    expect(isSupportedReactionEmoji('🌮')).toBe(true);
  });

  it('accepts flag emoji', () => {
    expect(isSupportedReactionEmoji('🇺🇸')).toBe(true);
    expect(isSupportedReactionEmoji('🇯🇵')).toBe(true);
  });

  it('accepts skin-toned emoji', () => {
    expect(isSupportedReactionEmoji('👍🏽')).toBe(true);
    expect(isSupportedReactionEmoji('👋🏿')).toBe(true);
  });

  it('accepts ZWJ sequences', () => {
    expect(isSupportedReactionEmoji('👨‍👩‍👧‍👦')).toBe(true);
    expect(isSupportedReactionEmoji('🏳️‍🌈')).toBe(true);
  });

  it('rejects non-emoji strings', () => {
    expect(isSupportedReactionEmoji('abc')).toBe(false);
    expect(isSupportedReactionEmoji('123')).toBe(false);
    expect(isSupportedReactionEmoji('hello')).toBe(false);
  });

  it('rejects empty and overly long strings', () => {
    expect(isSupportedReactionEmoji('')).toBe(false);
    expect(isSupportedReactionEmoji('a'.repeat(33))).toBe(false);
  });

  it('rejects multiple emoji (must be exactly one)', () => {
    expect(isSupportedReactionEmoji('😂🔥')).toBe(false);
    expect(isSupportedReactionEmoji('👍👍')).toBe(false);
  });
});
