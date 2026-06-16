import { describe, expect, it } from 'vitest';
import {
  escapeRegExp,
  buildHighlightMatcher,
  splitOnMatches,
} from './highlightText';

describe('escapeRegExp', () => {
  it('escapes all regex-special characters', () => {
    expect(escapeRegExp('.*+?^${}()|[]\\')).toBe(
      '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\',
    );
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeRegExp('deploy green')).toBe('deploy green');
  });
});

describe('buildHighlightMatcher', () => {
  it('returns null for an empty query', () => {
    expect(buildHighlightMatcher('')).toBeNull();
  });

  it('returns null for a whitespace-only query', () => {
    expect(buildHighlightMatcher('   \t  ')).toBeNull();
  });

  it('matches a single token case-insensitively', () => {
    const matcher = buildHighlightMatcher('Deploy');
    expect(matcher).not.toBeNull();
    expect('the deploy is done'.match(matcher!)).toEqual(['deploy']);
  });

  it('matches multiple tokens in any order', () => {
    const matcher = buildHighlightMatcher('deploy green');
    expect('green light, deploy now'.match(matcher!)).toEqual([
      'green',
      'deploy',
    ]);
  });
});

describe('splitOnMatches', () => {
  it('returns an empty array for empty text', () => {
    expect(splitOnMatches('', 'deploy')).toEqual([]);
  });

  it('returns one non-match segment when the query is empty', () => {
    expect(splitOnMatches('the deploy is done', '')).toEqual([
      { text: 'the deploy is done', isMatch: false },
    ]);
  });

  it('returns one non-match segment when nothing matches', () => {
    expect(splitOnMatches('all green here', 'deploy')).toEqual([
      { text: 'all green here', isMatch: false },
    ]);
  });

  it('marks a single matched run', () => {
    expect(splitOnMatches('the deploy is done', 'deploy')).toEqual([
      { text: 'the ', isMatch: false },
      { text: 'deploy', isMatch: true },
      { text: ' is done', isMatch: false },
    ]);
  });

  it('marks multiple tokens in any order', () => {
    expect(splitOnMatches('green deploy', 'deploy green')).toEqual([
      { text: 'green', isMatch: true },
      { text: ' ', isMatch: false },
      { text: 'deploy', isMatch: true },
    ]);
  });

  it('handles adjacent matches without dropping characters', () => {
    expect(splitOnMatches('abab', 'ab')).toEqual([
      { text: 'ab', isMatch: true },
      { text: 'ab', isMatch: true },
    ]);
  });

  it('matches regex-special queries literally', () => {
    expect(splitOnMatches('value is c++ here', 'c++')).toEqual([
      { text: 'value is ', isMatch: false },
      { text: 'c++', isMatch: true },
      { text: ' here', isMatch: false },
    ]);
    // A lone "." must not match every character.
    expect(splitOnMatches('a.b', '.')).toEqual([
      { text: 'a', isMatch: false },
      { text: '.', isMatch: true },
      { text: 'b', isMatch: false },
    ]);
  });

  it('preserves the original casing of matched text', () => {
    expect(splitOnMatches('The Deploy', 'deploy')).toEqual([
      { text: 'The ', isMatch: false },
      { text: 'Deploy', isMatch: true },
    ]);
  });

  it('reconstructs the input exactly for arbitrary inputs', () => {
    const cases: Array<[string, string]> = [
      ['the deploy is green', 'deploy green'],
      ['c++ and .* patterns', 'c++ .*'],
      ['ababab', 'ab'],
      ['no match here', 'xyz'],
      ['émoji 🚀 deploy', 'deploy'],
      ['', 'deploy'],
    ];
    for (const [text, query] of cases) {
      const joined = splitOnMatches(text, query)
        .map((s) => s.text)
        .join('');
      expect(joined).toBe(text);
    }
  });

  it('does not crash on unicode content', () => {
    expect(() => splitOnMatches('héllo 🚀 wörld', 'o')).not.toThrow();
  });
});
