const ANIMATION_BASE_PATH = "/animations/super-reactions";

export type SuperReactionPosition =
    | "top"
    | "left"
    | "center"
    | "right"
    | "bottom-right"
    | "bottom-left";

type SuperReactionEntry = {
    file: string;
    color: string; // RGB triplet for glow + chip tint
    position?: SuperReactionPosition; // animation position on chip, default "center"
};

const EMOJI_ANIMATION_MAP: Record<string, SuperReactionEntry> = {
    "\uD83C\uDFB0": {
        file: "gamba.json",
        color: "250, 130, 130",
        position: "center",
    },
    "\uD83D\uDCB0": {
        file: "wallet.json",
        color: "34, 197, 94",
        position: "bottom-left",
    },
    "\ud83d\udc7e": {
        file: "alien.json",
        color: "143, 0, 255",
        position: "center",
    },
};

export const SUPER_REACTION_EMOJIS = Object.keys(EMOJI_ANIMATION_MAP);

export function isSuperReactionEmoji(emoji: string): boolean {
    return emoji in EMOJI_ANIMATION_MAP;
}

export function getSuperReactionAnimationUrl(emoji: string): string {
    const entry = EMOJI_ANIMATION_MAP[emoji];
    if (!entry) return "";
    return `${ANIMATION_BASE_PATH}/${entry.file}`;
}

export function getSuperReactionColor(emoji: string): string | null {
    return EMOJI_ANIMATION_MAP[emoji]?.color ?? null;
}

export function getSuperReactionPosition(emoji: string): SuperReactionPosition {
    return EMOJI_ANIMATION_MAP[emoji]?.position ?? "center";
}
