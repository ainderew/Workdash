type DisplayNameInput = {
    name?: string | null;
    nickname?: string | null;
};

const normalizeName = (value?: string | null): string | null => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
};

export const getDisplayNameFromParts = (
    nickname?: string | null,
    name?: string | null,
    fallback: string = "User",
): string => {
    const normalizedNickname = normalizeName(nickname);
    if (normalizedNickname) return normalizedNickname;

    const normalizedName = normalizeName(name);
    if (normalizedName) return normalizedName;

    return fallback;
};

export const getDisplayName = (
    user?: DisplayNameInput | null,
    fallback: string = "User",
): string =>
    getDisplayNameFromParts(user?.nickname, user?.name, fallback);

export const getNameAliases = (
    user?: DisplayNameInput | null,
): string[] => {
    const aliases = new Set<string>();
    const nickname = normalizeName(user?.nickname);
    const name = normalizeName(user?.name);
    if (nickname) aliases.add(nickname);
    if (name) aliases.add(name);
    return Array.from(aliases);
};

