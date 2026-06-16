/**
 * Pure helpers for search-term highlighting. No React, no DOM.
 *
 * The query is tokenized on whitespace and each token is matched literally
 * (regex-escaped) — so adversarial input like `.*`, `(`, or `c++` is matched
 * as text rather than crashing or over-matching.
 */

export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

const REGEXP_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Escape regex-special characters so user input is matched literally. */
export function escapeRegExp(input: string): string {
  return input.replace(REGEXP_SPECIAL, '\\$&');
}

/**
 * Build a case-insensitive, global matcher from a free-text query.
 * Tokenizes on whitespace, drops empties, dedupes, escapes each token, and
 * joins with `|`. Returns null when there is nothing to match.
 *
 * A fresh RegExp is returned on every call so callers never share `lastIndex`.
 */
export function buildHighlightMatcher(query: string): RegExp | null {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const uniqueTokens = [...new Set(tokens)];
  const pattern = uniqueTokens.map(escapeRegExp).join('|');
  return new RegExp(`(${pattern})`, 'gi');
}

/**
 * Split `text` into ordered segments, marking the runs that match `query`.
 *
 * The concatenation of all returned `text` values always reconstructs the
 * input exactly (no characters dropped or duplicated). Returns a single
 * non-match segment when the query is empty or there are no matches, and an
 * empty array when `text` itself is empty.
 */
export function splitOnMatches(text: string, query: string): HighlightSegment[] {
  if (text === '') return [];

  const matcher = buildHighlightMatcher(query);
  if (!matcher) return [{ text, isMatch: false }];

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  matcher.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text)) !== null) {
    // Guard against a zero-length match looping forever.
    if (match.index === matcher.lastIndex) {
      matcher.lastIndex += 1;
      continue;
    }

    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isMatch: false });
    }
    segments.push({ text: match[0], isMatch: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false });
  }

  // No token matched anywhere — hand back the original text untouched.
  if (segments.length === 0) return [{ text, isMatch: false }];

  return segments;
}
