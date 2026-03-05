export function toWorkspaceInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "W";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function extractInviteCode(input: string): string {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        return url.searchParams.get("invite") ?? trimmed;
    } catch {
        return trimmed;
    }
}
