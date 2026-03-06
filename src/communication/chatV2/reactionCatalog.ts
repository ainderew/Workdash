import emojiRegex from 'emoji-regex';

export const CHAT_REACTION_QUICK_EMOJIS = ["😂", "❤️", "👍"] as const;

const fullEmojiRegex = emojiRegex();

export const isSupportedReactionEmoji = (input: string): boolean => {
    if (!input || input.length > 32) return false;
    const matches = input.match(fullEmojiRegex);
    return matches !== null && matches.length === 1 && matches[0] === input;
};
