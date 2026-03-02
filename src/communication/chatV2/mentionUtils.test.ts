import {
  getMentionQueryAtCursor,
  insertMentionIntoValue,
  buildMemberNameMap,
  extractMentionedUserIds,
  serializeMentionContentForSend,
  parseContentWithMentions,
  MentionMemberNameMap,
} from './mentionUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMember = (
  userId: number,
  name?: string | null,
  nickname?: string | null,
) => ({
  userId,
  user: { id: userId, name, nickname },
});

const buildMap = (
  ...entries: Array<[number, string, string[]]>
): MentionMemberNameMap => {
  const map: MentionMemberNameMap = new Map();
  for (const [userId, displayName, aliases] of entries) {
    map.set(userId, { displayName, aliases });
  }
  return map;
};

// ---------------------------------------------------------------------------
// getMentionQueryAtCursor
// ---------------------------------------------------------------------------

describe('getMentionQueryAtCursor', () => {
  it('returns the query string after @ when cursor is past the trigger', () => {
    const result = getMentionQueryAtCursor('hello @jo', 9);
    expect(result).toEqual({ query: 'jo', atIndex: 6 });
  });

  it('returns null when there is no @ in the value', () => {
    expect(getMentionQueryAtCursor('hello world', 5)).toBeNull();
  });

  it('requires whitespace (or start of string) before the @', () => {
    // "foo@bar" — no whitespace before @
    expect(getMentionQueryAtCursor('foo@bar', 7)).toBeNull();
    // start-of-string is fine
    expect(getMentionQueryAtCursor('@bar', 4)).toEqual({
      query: 'bar',
      atIndex: 0,
    });
  });

  it('returns null when cursor is at position 0', () => {
    expect(getMentionQueryAtCursor('@hello', 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// insertMentionIntoValue
// ---------------------------------------------------------------------------

describe('insertMentionIntoValue', () => {
  it('replaces the @query with @DisplayName and adds a trailing space', () => {
    //                          0123456789
    const value = 'hello @jo world';
    const { newValue, newCursorPosition } = insertMentionIntoValue(
      value,
      6, // atIndex
      9, // cursorPosition (end of "jo")
      'John',
    );

    expect(newValue).toBe('hello @John  world');
    expect(newCursorPosition).toBe(12); // right after "@John "
  });
});

// ---------------------------------------------------------------------------
// buildMemberNameMap
// ---------------------------------------------------------------------------

describe('buildMemberNameMap', () => {
  it('builds a map with displayName and aliases from members', () => {
    const members = [
      makeMember(1, 'Alice', 'Ali'),
      makeMember(2, 'Bob', null),
    ];

    const map = buildMemberNameMap(members);

    expect(map.size).toBe(2);
    expect(map.get(1)).toEqual({
      displayName: 'Ali', // nickname takes priority
      aliases: ['Ali', 'Alice'],
    });
    expect(map.get(2)).toEqual({
      displayName: 'Bob',
      aliases: ['Bob'],
    });
  });

  it('excludes the self user when selfUserId is provided', () => {
    const members = [
      makeMember(1, 'Alice', null),
      makeMember(2, 'Bob', null),
    ];

    const map = buildMemberNameMap(members, 1);

    expect(map.size).toBe(1);
    expect(map.has(1)).toBe(false);
    expect(map.has(2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractMentionedUserIds
// ---------------------------------------------------------------------------

describe('extractMentionedUserIds', () => {
  it('finds user IDs from @Name mentions in the value', () => {
    const map = buildMap([1, 'Alice', ['Alice']], [2, 'Bob', ['Bob']]);
    const result = extractMentionedUserIds('hey @Alice check this', map);
    expect(result).toEqual([1]);
  });

  it('handles <@123> token format and returns user IDs', () => {
    const map = buildMap([1, 'Alice', ['Alice']]);
    const result = extractMentionedUserIds('hey <@1> check this', map);
    expect(result).toEqual([1]);
  });

  it('matches longest alias first to avoid partial matches', () => {
    const map = buildMap(
      [1, 'Al', ['Al']],
      [2, 'Alice', ['Alice']],
    );
    const result = extractMentionedUserIds('hey @Alice!', map);
    // "Alice" is longer and should match before "Al" can partially match
    expect(result).toContain(2);
  });
});

// ---------------------------------------------------------------------------
// serializeMentionContentForSend
// ---------------------------------------------------------------------------

describe('serializeMentionContentForSend', () => {
  it('converts @Name patterns to <@userId> tokens', () => {
    const map = buildMap([1, 'Alice', ['Alice']], [2, 'Bob', ['Bob']]);
    const { content, mentionedUserIds } = serializeMentionContentForSend(
      'hey @Alice and @Bob',
      map,
    );

    expect(content).toBe('hey <@1> and <@2>');
    expect(mentionedUserIds).toEqual(expect.arrayContaining([1, 2]));
  });
});

// ---------------------------------------------------------------------------
// parseContentWithMentions
// ---------------------------------------------------------------------------

describe('parseContentWithMentions', () => {
  it('parses <@123> tokens into text and mention segments', () => {
    const map = buildMap([1, 'Alice', ['Alice']]);
    const segments = parseContentWithMentions('hello <@1> world', [1], map);

    expect(segments).toEqual([
      { type: 'text', content: 'hello ' },
      { type: 'mention', userId: 1, displayName: 'Alice' },
      { type: 'text', content: ' world' },
    ]);
  });

  it('parses @Name patterns into text and mention segments when no tokens present', () => {
    const map = buildMap([1, 'Alice', ['Alice']]);
    const segments = parseContentWithMentions('hello @Alice!', [1], map);

    expect(segments).toEqual([
      { type: 'text', content: 'hello ' },
      { type: 'mention', userId: 1, displayName: 'Alice' },
      { type: 'text', content: '!' },
    ]);
  });
});
