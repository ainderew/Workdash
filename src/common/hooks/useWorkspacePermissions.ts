import { useMemo } from 'react';
import useWorkspaceStore from '@/common/store/workspaceStore';
import useUserStore from '@/common/store/useStore';
import type { WorkspaceMember } from '@/communication/chatV2/_types';
import {
  computeEffectivePermissions,
  hasPermission,
  PERM,
  PERMISSIONS,
} from '@/common/utils/workspacePermissions';

export interface WorkspacePermissions {
  viewerUserId: number;
  isWorkspaceOwner: boolean;
  effectivePermissions: bigint;
  canKickMembers: boolean;
  canBanMembers: boolean;
  canManageRoles: boolean;
  canCreateInvite: boolean;
  canManageEmojis: boolean;
  canManageWorkspace: boolean;
}

const EMPTY_PERMISSIONS: WorkspacePermissions = {
  viewerUserId: 0,
  isWorkspaceOwner: false,
  effectivePermissions: BigInt(0),
  canKickMembers: false,
  canBanMembers: false,
  canManageRoles: false,
  canCreateInvite: false,
  canManageEmojis: false,
  canManageWorkspace: false,
};

export function useWorkspacePermissions(
  workspaceId: string | null | undefined,
): WorkspacePermissions {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const viewerUserId = useUserStore((s) => s.backendUser?.id ?? 0);

  return useMemo(() => {
    if (!workspaceId || viewerUserId === 0) return EMPTY_PERMISSIONS;

    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return EMPTY_PERMISSIONS;

    const isWorkspaceOwner = workspace.ownerId === viewerUserId;

    let effectivePermissions: bigint;
    if (isWorkspaceOwner) {
      effectivePermissions = ~BigInt(0);
    } else {
      const member = workspace.members?.find(
        (m: WorkspaceMember) => m.userId === viewerUserId,
      );
      effectivePermissions = member?.roles
        ? computeEffectivePermissions(member.roles)
        : BigInt(0);
    }

    return {
      viewerUserId,
      isWorkspaceOwner,
      effectivePermissions,
      canKickMembers: hasPermission(effectivePermissions, PERM.KICK_MEMBERS),
      canBanMembers: hasPermission(effectivePermissions, PERM.BAN_MEMBERS),
      canManageRoles: hasPermission(effectivePermissions, PERM.MANAGE_ROLES),
      canCreateInvite: hasPermission(effectivePermissions, PERM.CREATE_INVITE),
      canManageEmojis: hasPermission(effectivePermissions, PERM.ADMINISTRATOR),
      canManageWorkspace: hasPermission(effectivePermissions, PERMISSIONS.MANAGE_WORKSPACE.bit),
    };
  }, [workspaceId, workspaces, viewerUserId]);
}
