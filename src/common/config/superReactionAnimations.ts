const ANIMATION_BASE_PATH = '/animations/super-reactions';

const EMOJI_ANIMATION_MAP: Record<string, string> = {
    '\u2764\uFE0F': 'heart.json',
    '\uD83D\uDC4D': 'thumbsup.json',
    '\uD83D\uDE02': 'laughing.json',
};

export function getSuperReactionAnimationUrl(emoji: string): string {
    const fileName = EMOJI_ANIMATION_MAP[emoji] ?? 'default.json';
    return `${ANIMATION_BASE_PATH}/${fileName}`;
}
