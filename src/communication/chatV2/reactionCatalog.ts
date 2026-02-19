export const CHAT_REACTION_QUICK_EMOJIS = ["😂", "❤️", "👍"] as const;

export const CHAT_REACTION_EMOJI_CATALOG = [
    "😂",
    "❤️",
    "👍",
    "🔥",
    "🎉",
    "😮",
    "😢",
    "😡",
    "👏",
    "🙏",
    "💯",
    "🚀",
    "👀",
    "✅",
    "🤝",
    "🙌",
] as const;

const CATALOG_SET = new Set<string>(CHAT_REACTION_EMOJI_CATALOG);

export const isSupportedReactionEmoji = (emoji: string) =>
    CATALOG_SET.has(emoji);
