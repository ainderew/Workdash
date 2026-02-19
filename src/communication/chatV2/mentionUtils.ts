export type MentionQuery = {
  query: string;
  atIndex: number;
};

export type MentionContentSegment =
  | { type: 'text'; content: string }
  | { type: 'mention'; userId: number; displayName: string };

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Walk backward from cursor to find an active `@` trigger.
 * `@` must be at start of string or preceded by whitespace.
 */
export function getMentionQueryAtCursor(
  value: string,
  cursorPosition: number,
): MentionQuery | null {
  if (cursorPosition <= 0 || cursorPosition > value.length) return null;

  const before = value.slice(0, cursorPosition);
  const lastAtIndex = before.lastIndexOf('@');
  if (lastAtIndex === -1) return null;

  // `@` must be at start or preceded by whitespace
  if (lastAtIndex > 0 && !/\s/.test(before[lastAtIndex - 1])) return null;

  const query = before.slice(lastAtIndex + 1);

  // No newlines or additional `@` in the query
  if (/[\n@]/.test(query)) return null;

  return { query, atIndex: lastAtIndex };
}

/**
 * Replace `@query` with `@DisplayName ` in the textarea value.
 */
export function insertMentionIntoValue(
  value: string,
  atIndex: number,
  cursorPosition: number,
  displayName: string,
): { newValue: string; newCursorPosition: number } {
  const insertion = `@${displayName} `;
  const newValue =
    value.slice(0, atIndex) + insertion + value.slice(cursorPosition);
  const newCursorPosition = atIndex + insertion.length;
  return { newValue, newCursorPosition };
}

/**
 * Build a userId → displayName map from room members.
 * Optionally excludes self.
 */
export function buildMemberNameMap(
  members: Array<{ userId: number; user: { id: number; name: string } }>,
  selfUserId?: number,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const member of members) {
    if (selfUserId !== undefined && member.userId === selfUserId) continue;
    const name = member.user.name?.trim();
    if (name) {
      map.set(member.userId, name);
    }
  }
  return map;
}

/**
 * Scan the textarea value for `@Name` patterns and return matching user IDs.
 * Sorts names longest-first to avoid partial matches.
 */
export function extractMentionedUserIds(
  textareaValue: string,
  memberNameMap: Map<number, string>,
): number[] {
  if (!textareaValue.trim()) return [];

  // Sort longest name first to avoid partial matching
  const entries = Array.from(memberNameMap.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );

  const matched = new Set<number>();
  for (const [userId, name] of entries) {
    const pattern = new RegExp(
      `(?:^|\\s)@${escapeRegExp(name)}(?=\\s|$)`,
    );
    if (pattern.test(textareaValue)) {
      matched.add(userId);
    }
  }

  return Array.from(matched);
}

/**
 * Parse message content into text + mention segments for rendering.
 */
export function parseContentWithMentions(
  content: string,
  mentionedUserIds: number[],
  memberNameMap: Map<number, string>,
): MentionContentSegment[] {
  if (!mentionedUserIds.length || !content) {
    return [{ type: 'text', content }];
  }

  // Build lookup of names for mentioned users only
  const mentionedNames: Array<{ userId: number; displayName: string }> = [];
  for (const userId of mentionedUserIds) {
    const name = memberNameMap.get(userId);
    if (name) {
      mentionedNames.push({ userId, displayName: name });
    }
  }

  if (mentionedNames.length === 0) {
    return [{ type: 'text', content }];
  }

  // Sort longest first
  mentionedNames.sort((a, b) => b.displayName.length - a.displayName.length);

  // Build combined regex
  const pattern = new RegExp(
    `@(${mentionedNames.map((entry) => escapeRegExp(entry.displayName)).join('|')})`,
    'g',
  );

  const segments: MentionContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const matchedName = match[1];
    const mentionEntry = mentionedNames.find(
      (entry) => entry.displayName === matchedName,
    );
    if (!mentionEntry) continue;

    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: 'mention',
      userId: mentionEntry.userId,
      displayName: mentionEntry.displayName,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }];
}
