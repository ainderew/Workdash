import { renderHook } from '@testing-library/react';
import { useWorkspacePermissions } from './useWorkspacePermissions';
import useWorkspaceStore from '@/common/store/workspaceStore';
import useUserStore from '@/common/store/useStore';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/communication/chatV2/_types';
import { PERM, PERMISSIONS } from '@/common/utils/workspacePermissions';

const makeRole = (perms: bigint, overrides: Partial<WorkspaceRole> = {}): WorkspaceRole => ({
  id: 'role-1',
  workspaceId: 'ws-1',
  name: 'Test Role',
  permissions: perms.toString(),
  color: 0,
  position: 1,
  isEveryone: false,
  isHoisted: false,
  isMentionable: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeMember = (userId: number, roles: WorkspaceRole[] = []): WorkspaceMember => ({
  workspaceId: 'ws-1',
  userId,
  joinedAt: '2026-01-01T00:00:00.000Z',
  roles,
});

const makeWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'ws-1',
  name: 'Test Workspace',
  iconUrl: null,
  ownerId: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function setupStores(opts: {
  workspaces?: Workspace[];
  backendUserId?: number | null;
}) {
  useWorkspaceStore.setState({ workspaces: opts.workspaces ?? [] });
  useUserStore.setState({
    backendUser: opts.backendUserId != null
      ? { id: opts.backendUserId, name: 'Test', email: 'test@test.com', image: null } as never
      : null,
  });
}

beforeEach(() => {
  useWorkspaceStore.setState({ workspaces: [], isLoading: false, isCreating: false, error: null });
  useUserStore.setState({ backendUser: null });
});

describe('useWorkspacePermissions', () => {
  describe('edge cases — returns all-false', () => {
    it('returns empty permissions when workspaceId is null', () => {
      setupStores({ backendUserId: 1 });
      const { result } = renderHook(() => useWorkspacePermissions(null));

      expect(result.current.viewerUserId).toBe(0);
      expect(result.current.isWorkspaceOwner).toBe(false);
      expect(result.current.canKickMembers).toBe(false);
      expect(result.current.canManageEmojis).toBe(false);
    });

    it('returns empty permissions when workspaceId is undefined', () => {
      setupStores({ backendUserId: 1 });
      const { result } = renderHook(() => useWorkspacePermissions(undefined));

      expect(result.current.isWorkspaceOwner).toBe(false);
      expect(result.current.effectivePermissions).toBe(BigInt(0));
    });

    it('returns empty permissions when backendUser is null', () => {
      setupStores({ workspaces: [makeWorkspace()], backendUserId: null });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.viewerUserId).toBe(0);
      expect(result.current.isWorkspaceOwner).toBe(false);
      expect(result.current.canKickMembers).toBe(false);
    });

    it('returns empty permissions when workspace is not found', () => {
      setupStores({ workspaces: [makeWorkspace()], backendUserId: 1 });
      const { result } = renderHook(() => useWorkspacePermissions('ws-nonexistent'));

      expect(result.current.isWorkspaceOwner).toBe(false);
      expect(result.current.effectivePermissions).toBe(BigInt(0));
    });

    it('returns empty permissions when workspace has no members array', () => {
      setupStores({
        workspaces: [makeWorkspace({ ownerId: 100 })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.isWorkspaceOwner).toBe(false);
      expect(result.current.canKickMembers).toBe(false);
      expect(result.current.effectivePermissions).toBe(BigInt(0));
    });

    it('returns empty permissions when member exists but roles is undefined', () => {
      const member: WorkspaceMember = { workspaceId: 'ws-1', userId: 50, joinedAt: '2026-01-01' };
      // roles is undefined
      setupStores({
        workspaces: [makeWorkspace({ ownerId: 100, members: [member] })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canKickMembers).toBe(false);
      expect(result.current.effectivePermissions).toBe(BigInt(0));
    });

    it('returns empty permissions when member has empty roles array', () => {
      setupStores({
        workspaces: [makeWorkspace({ ownerId: 100, members: [makeMember(50, [])] })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canKickMembers).toBe(false);
      expect(result.current.canManageEmojis).toBe(false);
      expect(result.current.effectivePermissions).toBe(BigInt(0));
    });
  });

  describe('workspace owner', () => {
    it('grants all permissions when viewer is the workspace owner', () => {
      setupStores({
        workspaces: [makeWorkspace({ ownerId: 42 })],
        backendUserId: 42,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.viewerUserId).toBe(42);
      expect(result.current.isWorkspaceOwner).toBe(true);
      expect(result.current.canKickMembers).toBe(true);
      expect(result.current.canBanMembers).toBe(true);
      expect(result.current.canManageRoles).toBe(true);
      expect(result.current.canCreateInvite).toBe(true);
      expect(result.current.canManageEmojis).toBe(true);
      expect(result.current.canManageWorkspace).toBe(true);
    });
  });

  describe('individual permissions', () => {
    it('canKickMembers is true with KICK_MEMBERS role', () => {
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(PERM.KICK_MEMBERS)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canKickMembers).toBe(true);
      expect(result.current.canBanMembers).toBe(false);
      expect(result.current.canManageRoles).toBe(false);
      expect(result.current.canCreateInvite).toBe(false);
      expect(result.current.canManageEmojis).toBe(false);
    });

    it('canBanMembers is true with BAN_MEMBERS role', () => {
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(PERM.BAN_MEMBERS)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canBanMembers).toBe(true);
      expect(result.current.canKickMembers).toBe(false);
    });

    it('canManageRoles is true with MANAGE_ROLES role', () => {
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(PERM.MANAGE_ROLES)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canManageRoles).toBe(true);
      expect(result.current.canManageEmojis).toBe(false);
    });

    it('canCreateInvite is true with CREATE_INVITE role', () => {
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(PERM.CREATE_INVITE)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canCreateInvite).toBe(true);
      expect(result.current.canKickMembers).toBe(false);
    });

    it('canManageWorkspace is true with MANAGE_WORKSPACE role', () => {
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(PERMISSIONS.MANAGE_WORKSPACE.bit)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canManageWorkspace).toBe(true);
      expect(result.current.canManageEmojis).toBe(false);
    });
  });

  describe('ADMINISTRATOR permission', () => {
    it('grants all permissions when viewer has ADMINISTRATOR role', () => {
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(PERM.ADMINISTRATOR)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.isWorkspaceOwner).toBe(false);
      expect(result.current.canKickMembers).toBe(true);
      expect(result.current.canBanMembers).toBe(true);
      expect(result.current.canManageRoles).toBe(true);
      expect(result.current.canCreateInvite).toBe(true);
      expect(result.current.canManageEmojis).toBe(true);
      expect(result.current.canManageWorkspace).toBe(true);
    });

    it('canManageEmojis is false without ADMINISTRATOR', () => {
      const allExceptAdmin = PERM.KICK_MEMBERS | PERM.BAN_MEMBERS | PERM.MANAGE_ROLES | PERM.CREATE_INVITE;
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(allExceptAdmin)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canKickMembers).toBe(true);
      expect(result.current.canBanMembers).toBe(true);
      expect(result.current.canManageEmojis).toBe(false);
    });
  });

  describe('multiple roles', () => {
    it('ORs permissions across multiple roles', () => {
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [
            makeRole(PERM.KICK_MEMBERS, { id: 'r1', name: 'Moderator' }),
            makeRole(PERM.CREATE_INVITE, { id: 'r2', name: 'Inviter' }),
          ])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.canKickMembers).toBe(true);
      expect(result.current.canCreateInvite).toBe(true);
      expect(result.current.canBanMembers).toBe(false);
    });
  });

  describe('effectivePermissions raw bigint', () => {
    it('returns correct raw bigint for a known role combination', () => {
      const perms = PERM.KICK_MEMBERS | PERM.BAN_MEMBERS;
      setupStores({
        workspaces: [makeWorkspace({
          ownerId: 100,
          members: [makeMember(50, [makeRole(perms)])],
        })],
        backendUserId: 50,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.effectivePermissions).toBe(perms);
    });

    it('returns ~BigInt(0) for workspace owner', () => {
      setupStores({
        workspaces: [makeWorkspace({ ownerId: 42 })],
        backendUserId: 42,
      });
      const { result } = renderHook(() => useWorkspacePermissions('ws-1'));

      expect(result.current.effectivePermissions).toBe(~BigInt(0));
    });
  });
});
