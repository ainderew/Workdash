import { useEffect, useMemo, useRef } from 'react';
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
  canManageMusic: boolean;
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
  canManageMusic: false,
};

export function useWorkspacePermissions(
  workspaceId: string | null | undefined,
): WorkspacePermissions {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const fetchWorkspaceDetail = useWorkspaceStore((s) => s.fetchWorkspaceDetail);
  const viewerUserId = useUserStore((s) => s.backendUser?.id ?? 0);
  const fetchedRef = useRef<string | null>(null);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const needsDetail =
    !!workspaceId &&
    viewerUserId > 0 &&
    !!workspace &&
    workspace.ownerId !== viewerUserId &&
    !workspace.members;

  useEffect(() => {
    if (needsDetail && workspaceId && fetchedRef.current !== workspaceId) {
      fetchedRef.current = workspaceId;
      void fetchWorkspaceDetail(workspaceId);
    }
  }, [needsDetail, workspaceId, fetchWorkspaceDetail]);

  return useMemo(() => {
    if (!workspaceId || viewerUserId === 0) return EMPTY_PERMISSIONS;

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
      canManageEmojis: hasPermission(effectivePermissions, PERM.MANAGE_EMOJIS),
      canManageWorkspace: hasPermission(effectivePermissions, PERMISSIONS.MANAGE_WORKSPACE.bit),
      canManageMusic: hasPermission(effectivePermissions, PERM.MANAGE_MUSIC),
    };
  }, [workspaceId, workspace, viewerUserId]);
}
