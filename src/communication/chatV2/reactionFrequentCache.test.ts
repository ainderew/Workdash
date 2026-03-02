import {
  getFrequentEmojiCacheKey,
  readFrequentEmojiLocal,
  writeFrequentEmojiLocal,
  bumpFrequentEmojiLocal,
  mergeFrequentEmojiSources,
} from './reactionFrequentCache';

beforeEach(() => {
  window.localStorage.clear();
});

describe('getFrequentEmojiCacheKey', () => {
  it('returns the correct cache key format for a given userId', () => {
    expect(getFrequentEmojiCacheKey(42)).toBe(
      'wd:chat:v2:frequent-emojis:42:v1',
    );
    expect(getFrequentEmojiCacheKey(1)).toBe(
      'wd:chat:v2:frequent-emojis:1:v1',
    );
  });
});

describe('readFrequentEmojiLocal', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(readFrequentEmojiLocal(1)).toEqual([]);
  });

  it('parses valid entries from localStorage', () => {
    const entries = [
      { emoji: '🔥', usageCount: 5, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '👍', usageCount: 3, lastUsedAt: '2026-01-02T00:00:00.000Z' },
    ];
    window.localStorage.setItem(
      getFrequentEmojiCacheKey(1),
      JSON.stringify(entries),
    );

    const result = readFrequentEmojiLocal(1);
    expect(result).toHaveLength(2);
    expect(result[0].emoji).toBe('🔥');
    expect(result[0].usageCount).toBe(5);
    expect(result[1].emoji).toBe('👍');
    expect(result[1].usageCount).toBe(3);
  });

  it('filters out unsupported emojis', () => {
    const entries = [
      { emoji: '👍', usageCount: 3, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '🦄', usageCount: 10, lastUsedAt: '2026-01-01T00:00:00.000Z' },
    ];
    window.localStorage.setItem(
      getFrequentEmojiCacheKey(1),
      JSON.stringify(entries),
    );

    const result = readFrequentEmojiLocal(1);
    expect(result).toHaveLength(1);
    expect(result[0].emoji).toBe('👍');
  });

  it('sorts by usageCount desc then lastUsedAt desc', () => {
    const entries = [
      { emoji: '👍', usageCount: 2, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '🔥', usageCount: 5, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '🎉', usageCount: 5, lastUsedAt: '2026-01-03T00:00:00.000Z' },
    ];
    window.localStorage.setItem(
      getFrequentEmojiCacheKey(1),
      JSON.stringify(entries),
    );

    const result = readFrequentEmojiLocal(1);
    expect(result.map((e) => e.emoji)).toEqual(['🎉', '🔥', '👍']);
  });
});

describe('writeFrequentEmojiLocal', () => {
  it('serializes entries to localStorage', () => {
    const entries = [
      { emoji: '😂', usageCount: 7, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '❤️', usageCount: 3, lastUsedAt: '2026-01-02T00:00:00.000Z' },
    ];
    writeFrequentEmojiLocal(1, entries);

    const stored = JSON.parse(
      window.localStorage.getItem(getFrequentEmojiCacheKey(1))!,
    );
    expect(stored).toHaveLength(2);
    expect(stored[0].emoji).toBe('😂');
    expect(stored[1].emoji).toBe('❤️');
  });

  it('caps entries at 32', () => {
    const entries = Array.from({ length: 40 }, (_, i) => ({
      emoji: '👍',
      usageCount: i,
      lastUsedAt: '2026-01-01T00:00:00.000Z',
    }));
    writeFrequentEmojiLocal(1, entries);

    const stored = JSON.parse(
      window.localStorage.getItem(getFrequentEmojiCacheKey(1))!,
    );
    expect(stored).toHaveLength(32);
  });
});

describe('bumpFrequentEmojiLocal', () => {
  it('creates a new entry for an emoji that does not exist yet', () => {
    const at = new Date('2026-02-15T12:00:00.000Z');
    const result = bumpFrequentEmojiLocal(1, '🚀', at);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          emoji: '🚀',
          usageCount: 1,
          lastUsedAt: at.toISOString(),
        }),
      ]),
    );
  });

  it('increments usage count for an existing emoji', () => {
    const seed = [
      { emoji: '🔥', usageCount: 3, lastUsedAt: '2026-01-01T00:00:00.000Z' },
    ];
    window.localStorage.setItem(
      getFrequentEmojiCacheKey(1),
      JSON.stringify(seed),
    );

    const at = new Date('2026-02-15T12:00:00.000Z');
    const result = bumpFrequentEmojiLocal(1, '🔥', at);

    const entry = result.find((e) => e.emoji === '🔥');
    expect(entry).toBeDefined();
    expect(entry!.usageCount).toBe(4);
    expect(entry!.lastUsedAt).toBe(at.toISOString());
  });

  it('returns an empty array for an unsupported emoji', () => {
    const result = bumpFrequentEmojiLocal(1, '🦄');
    expect(result).toEqual([]);
  });
});

describe('mergeFrequentEmojiSources', () => {
  it('merges local and server entries, taking the higher usage count', () => {
    const local = [
      { emoji: '👍', usageCount: 5, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '🔥', usageCount: 2, lastUsedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const server = [
      { emoji: '👍', usageCount: 3, lastUsedAt: '2026-01-02T00:00:00.000Z' },
      { emoji: '🎉', usageCount: 8, lastUsedAt: '2026-01-01T00:00:00.000Z' },
    ];

    const result = mergeFrequentEmojiSources(local, server, 32);
    expect(result).toHaveLength(3);

    const thumbs = result.find((e) => e.emoji === '👍')!;
    expect(thumbs.usageCount).toBe(5);
    // server lastUsedAt is later, so it should be picked
    expect(thumbs.lastUsedAt).toBe('2026-01-02T00:00:00.000Z');

    const party = result.find((e) => e.emoji === '🎉')!;
    expect(party.usageCount).toBe(8);
  });

  it('respects the limit parameter', () => {
    const local = [
      { emoji: '😂', usageCount: 5, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '❤️', usageCount: 4, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { emoji: '👍', usageCount: 3, lastUsedAt: '2026-01-01T00:00:00.000Z' },
    ];

    const result = mergeFrequentEmojiSources(local, [], 2);
    expect(result).toHaveLength(2);
    expect(result[0].emoji).toBe('😂');
    expect(result[1].emoji).toBe('❤️');
  });
});
