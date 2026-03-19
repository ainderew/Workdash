import { getDisplayName, getNameAliases } from "@/common/utils/displayName";

export type MentionQuery = {
    query: string;
    atIndex: number;
};

export type MentionContentSegment =
    | { type: "text"; content: string }
    | { type: "mention"; userId: number; displayName: string }
    | { type: "everyone_mention" };

const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MENTION_TOKEN_PATTERN = /<@(\d+)>/g;

export type MentionMemberNameEntry = {
    displayName: string;
    aliases: string[];
};

export type MentionMemberNameMap = Map<number, MentionMemberNameEntry>;

export type SerializedMentionContent = {
    content: string;
    mentionedUserIds: number[];
};

const extractMentionTokenUserIds = (content: string): number[] => {
    if (!content.trim()) return [];

    const matched = new Set<number>();
    const regex = new RegExp(MENTION_TOKEN_PATTERN.source, "g");
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = regex.exec(content)) !== null) {
        const parsedUserId = Number(tokenMatch[1]);
        if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) continue;
        matched.add(parsedUserId);
    }

    return Array.from(matched);
};

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
    const lastAtIndex = before.lastIndexOf("@");
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
    members: Array<{
        userId: number;
        user: {
            id: number;
            name?: string | null;
            nickname?: string | null;
        };
    }>,
    selfUserId?: number,
): MentionMemberNameMap {
    const map: MentionMemberNameMap = new Map();
    for (const member of members) {
        if (selfUserId !== undefined && member.userId === selfUserId) continue;

        const aliases = getNameAliases({
            nickname: member.user.nickname,
            name: member.user.name,
        });
        if (aliases.length === 0) continue;

        map.set(member.userId, {
            displayName: getDisplayName(
                {
                    nickname: member.user.nickname,
                    name: member.user.name,
                },
                `User ${member.userId}`,
            ),
            aliases,
        });
    }
    return map;
}

/**
 * Scan the textarea value for `@Name` patterns and return matching user IDs.
 * Sorts names longest-first to avoid partial matches.
 */
export function extractMentionedUserIds(
    textareaValue: string,
    memberNameMap: MentionMemberNameMap,
): number[] {
    if (!textareaValue.trim()) return [];

    const tokenMentionedUserIds = extractMentionTokenUserIds(textareaValue);
    if (tokenMentionedUserIds.length > 0) {
        return tokenMentionedUserIds;
    }

    const aliases = Array.from(memberNameMap.entries())
        .flatMap(([userId, value]) =>
            value.aliases.map((alias) => ({ userId, alias })),
        )
        .sort((a, b) => b.alias.length - a.alias.length);

    const matched = new Set<number>();
    for (const entry of aliases) {
        const pattern = new RegExp(
            `(?:^|\\s)@${escapeRegExp(entry.alias)}(?=\\s|$|[.,!?;:])`,
            "i",
        );
        if (pattern.test(textareaValue)) {
            matched.add(entry.userId);
        }
    }

    return Array.from(matched);
}

export function serializeMentionContentForSend(
    textareaValue: string,
    memberNameMap: MentionMemberNameMap,
): SerializedMentionContent {
    if (!textareaValue.trim()) {
        return {
            content: textareaValue,
            mentionedUserIds: [],
        };
    }

    const aliasEntries = Array.from(memberNameMap.entries())
        .flatMap(([userId, value]) =>
            value.aliases.map((alias) => ({ userId, alias })),
        )
        .sort((a, b) => b.alias.length - a.alias.length);

    let serializedContent = textareaValue;

    // Replace @everyone BEFORE alias loop
    serializedContent = serializedContent.replace(
        /(^|\s)@everyone(?=\s|$|[.,!?;:])/gi,
        (_match, leadingWhitespace: string) => `${leadingWhitespace}<@everyone>`,
    );

    for (const entry of aliasEntries) {
        const pattern = new RegExp(
            `(^|\\s)@${escapeRegExp(entry.alias)}(?=\\s|$|[.,!?;:])`,
            "gi",
        );
        serializedContent = serializedContent.replace(
            pattern,
            (_matched, leadingWhitespace: string) =>
                `${leadingWhitespace}<@${entry.userId}>`,
        );
    }

    return {
        content: serializedContent,
        mentionedUserIds: extractMentionedUserIds(
            serializedContent,
            memberNameMap,
        ),
    };
}

/**
 * Parse message content into text + mention segments for rendering.
 */
export function parseContentWithMentions(
    content: string,
    mentionedUserIds: number[],
    memberNameMap: MentionMemberNameMap,
): MentionContentSegment[] {
    if (!content) {
        return [{ type: "text", content }];
    }

    const hasAnyMentionTokens = (c: string) => /<@(\d+|everyone)>/.test(c);

    if (hasAnyMentionTokens(content)) {
        const segments: MentionContentSegment[] = [];
        let lastIndex = 0;
        const allTokenRegex = /<@(\d+|everyone)>/g;
        let tokenMatch: RegExpExecArray | null;

        while ((tokenMatch = allTokenRegex.exec(content)) !== null) {
            const captured = tokenMatch[1];

            if (tokenMatch.index > lastIndex) {
                segments.push({
                    type: "text",
                    content: content.slice(lastIndex, tokenMatch.index),
                });
            }

            if (captured === "everyone") {
                segments.push({ type: "everyone_mention" });
            } else {
                const parsedUserId = Number(captured);
                if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
                    lastIndex = tokenMatch.index + tokenMatch[0].length;
                    continue;
                }
                segments.push({
                    type: "mention",
                    userId: parsedUserId,
                    displayName:
                        getMemberDisplayName(memberNameMap, parsedUserId) ||
                        `User ${parsedUserId}`,
                });
            }

            lastIndex = tokenMatch.index + tokenMatch[0].length;
        }

        if (lastIndex < content.length) {
            segments.push({
                type: "text",
                content: content.slice(lastIndex),
            });
        }

        return segments.length > 0 ? segments : [{ type: "text", content }];
    }

    if (!mentionedUserIds.length) {
        return [{ type: "text", content }];
    }

    const mentionAliases: Array<{ userId: number; alias: string }> = [];
    for (const userId of mentionedUserIds) {
        const memberNameEntry = memberNameMap.get(userId);
        if (!memberNameEntry) continue;

        for (const alias of memberNameEntry.aliases) {
            mentionAliases.push({ userId, alias });
        }
    }

    if (mentionAliases.length === 0) {
        return [{ type: "text", content }];
    }

    mentionAliases.sort((a, b) => b.alias.length - a.alias.length);

    const pattern = new RegExp(
        `(^|\\s)@(${mentionAliases
            .map((entry) => escapeRegExp(entry.alias))
            .join("|")})(?=\\s|$|[.,!?;:])`,
        "gi",
    );

    const segments: MentionContentSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
        const leadingWhitespace = match[1] || "";
        const matchedAlias = match[2];
        const matchedAliasLower = matchedAlias.toLowerCase();
        const mentionStartIndex = match.index + leadingWhitespace.length;
        const mentionAlias = mentionAliases.find(
            (entry) => entry.alias.toLowerCase() === matchedAliasLower,
        );
        if (!mentionAlias) continue;

        if (mentionStartIndex > lastIndex) {
            segments.push({
                type: "text",
                content: content.slice(lastIndex, mentionStartIndex),
            });
        }

        segments.push({
            type: "mention",
            userId: mentionAlias.userId,
            displayName: matchedAlias,
        });

        lastIndex = mentionStartIndex + 1 + matchedAlias.length;
    }

    if (lastIndex < content.length) {
        segments.push({
            type: "text",
            content: content.slice(lastIndex),
        });
    }

    return segments.length > 0 ? segments : [{ type: "text", content }];
}

/**
 * Convert stored `<@123>` tokens back to `@DisplayName` for editing.
 */
export function deserializeMentionContent(
    content: string,
    memberNameMap: MentionMemberNameMap,
): string {
    return content
        .replace(/<@everyone>/g, "@everyone")
        .replace(/<@(\d+)>/g, (_match, userIdStr: string) => {
            const userId = Number(userIdStr);
            const entry = memberNameMap.get(userId);
            return entry ? `@${entry.displayName}` : `@Unknown`;
        });
}

export function getMemberDisplayName(
    memberNameMap: MentionMemberNameMap,
    userId: number,
): string | null {
    const entry = memberNameMap.get(userId);
    if (!entry) return null;
    return entry.displayName;
}

export function getMemberAliases(
    memberNameMap: MentionMemberNameMap,
    userId: number,
): string[] {
    const entry = memberNameMap.get(userId);
    return entry?.aliases || [];
}
