import type { WorkspaceMember } from "@/communication/chatV2/_types";

export function colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

const OWNER_COLOR = "#E91E63";

/**
 * Returns the hex color for a member's top (highest position) non-everyone role.
 * Owner always gets red. Returns null if no colored role.
 */
export function getMemberRoleColor(
    member: WorkspaceMember,
    ownerUserId: number,
): string | null {
    if (member.userId === ownerUserId) return OWNER_COLOR;

    const topRole = member.roles
        ?.filter((r) => !r.isEveryone)
        .sort((a, b) => b.position - a.position)[0];

    if (!topRole || !topRole.color) return null;
    return colorToHex(topRole.color);
}

/**
 * Builds a map of userId -> hex color string for all workspace members.
 */
export function buildMemberColorMap(
    members: WorkspaceMember[],
    ownerUserId: number,
): Map<number, string> {
    const map = new Map<number, string>();
    for (const member of members) {
        const color = getMemberRoleColor(member, ownerUserId);
        if (color) map.set(member.userId, color);
    }
    return map;
}
