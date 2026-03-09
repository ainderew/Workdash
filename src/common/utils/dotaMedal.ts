const MEDAL_NAMES: Record<number, string> = {
    1: 'Herald',
    2: 'Guardian',
    3: 'Crusader',
    4: 'Archon',
    5: 'Legend',
    6: 'Ancient',
    7: 'Divine',
    8: 'Immortal',
};

export type MedalInfo = {
    medal: number;
    stars: number;
    label: string;
    imagePath: string;
};

export function parseMedal(
    rankTier: number | null | undefined,
): MedalInfo | null {
    if (!rankTier || rankTier <= 0) return null;

    const medal = Math.floor(rankTier / 10);
    const stars = rankTier % 10;

    const medalName = MEDAL_NAMES[medal];
    if (!medalName) return null;

    return {
        medal,
        stars,
        label: stars > 0 ? `${medalName} ${stars}` : medalName,
        imagePath: `/assets/dota-medals/${medalName.toLowerCase()}.png`,
    };
}
