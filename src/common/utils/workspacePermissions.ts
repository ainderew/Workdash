import type { WorkspaceRole } from "@/communication/chatV2/_types";

const B1 = BigInt(1);
const bit = (shift: number) => B1 << BigInt(shift);

export const PERMISSIONS: Record<
    string,
    { bit: bigint; label: string; category: string }
> = {
    VIEW_CHANNEL: { bit: bit(0), label: "View Channel", category: "General" },
    SEND_MESSAGES: { bit: bit(1), label: "Send Messages", category: "Text" },
    MANAGE_MESSAGES: { bit: bit(2), label: "Manage Messages", category: "Moderation" },
    MANAGE_CHANNELS: { bit: bit(3), label: "Manage Channels", category: "Administration" },
    MANAGE_WORKSPACE: { bit: bit(4), label: "Manage Workspace", category: "Administration" },
    KICK_MEMBERS: { bit: bit(5), label: "Kick Members", category: "Moderation" },
    BAN_MEMBERS: { bit: bit(6), label: "Ban Members", category: "Moderation" },
    ADMINISTRATOR: { bit: bit(7), label: "Administrator", category: "Administration" },
    MANAGE_ROLES: { bit: bit(8), label: "Manage Roles", category: "Administration" },
    MENTION_EVERYONE: { bit: bit(9), label: "Mention Everyone", category: "Text" },
    ADD_REACTIONS: { bit: bit(10), label: "Add Reactions", category: "Text" },
    READ_HISTORY: { bit: bit(11), label: "Read History", category: "General" },
    CONNECT: { bit: bit(12), label: "Connect", category: "Voice" },
    SPEAK: { bit: bit(13), label: "Speak", category: "Voice" },
    MUTE_MEMBERS: { bit: bit(14), label: "Mute Members", category: "Voice" },
    MOVE_MEMBERS: { bit: bit(15), label: "Move Members", category: "Voice" },
    MANAGE_CATEGORIES: { bit: bit(16), label: "Manage Categories", category: "Administration" },
    CREATE_INVITE: { bit: bit(17), label: "Create Invite", category: "General" },
    MANAGE_WORLD: { bit: bit(18), label: "Manage World", category: "Administration" },
    MODERATE_MEMBERS: { bit: bit(19), label: "Moderate Members", category: "Moderation" },
    ATTACH_FILES: { bit: bit(20), label: "Attach Files", category: "Text" },
    EMBED_LINKS: { bit: bit(21), label: "Embed Links", category: "Text" },
};

export const PERMISSION_CATEGORIES = [
    "General",
    "Text",
    "Voice",
    "Moderation",
    "Administration",
] as const;

export const PERM = {
    KICK_MEMBERS: PERMISSIONS.KICK_MEMBERS.bit,
    BAN_MEMBERS: PERMISSIONS.BAN_MEMBERS.bit,
    ADMINISTRATOR: PERMISSIONS.ADMINISTRATOR.bit,
    MANAGE_ROLES: PERMISSIONS.MANAGE_ROLES.bit,
    CREATE_INVITE: PERMISSIONS.CREATE_INVITE.bit,
} as const;

export function computeEffectivePermissions(roles: WorkspaceRole[]): bigint {
    return roles.reduce((acc, role) => acc | BigInt(role.permissions), BigInt(0));
}

export function hasPermission(effectivePerms: bigint, flag: bigint): boolean {
    if ((effectivePerms & PERM.ADMINISTRATOR) === PERM.ADMINISTRATOR) return true;
    return (effectivePerms & flag) === flag;
}
