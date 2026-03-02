import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import type { Workspace } from '@/communication/chatV2/_types';
import useWorkspaceStore from './workspaceStore';

vi.mock('@/communication/chatV2/chatV2Service', () => ({
  ChatV2Service: {
    getInstance: vi.fn(),
  },
}));

const makeWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'ws-1',
  name: 'Test Workspace',
  iconUrl: null,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const mockService = {
  listWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
};

beforeEach(() => {
  useWorkspaceStore.setState({
    workspaces: [],
    isLoading: false,
    isCreating: false,
    error: null,
  });
  vi.clearAllMocks();
  (ChatV2Service.getInstance as ReturnType<typeof vi.fn>).mockReturnValue(
    mockService,
  );
});

describe('useWorkspaceStore', () => {
  describe('initial state', () => {
    it('has empty workspaces, not loading, and no error', () => {
      const state = useWorkspaceStore.getState();

      expect(state.workspaces).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isCreating).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchMyWorkspaces', () => {
    it('sets isLoading to true while fetching', async () => {
      let resolvePromise: (value: Workspace[]) => void;
      mockService.listWorkspaces.mockReturnValue(
        new Promise<Workspace[]>((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const fetchPromise =
        useWorkspaceStore.getState().fetchMyWorkspaces();

      expect(useWorkspaceStore.getState().isLoading).toBe(true);

      resolvePromise!([]);
      await fetchPromise;
    });

    it('populates workspaces and clears isLoading on success', async () => {
      const workspaces = [
        makeWorkspace({ id: 'ws-1', name: 'Alpha' }),
        makeWorkspace({ id: 'ws-2', name: 'Beta' }),
      ];
      mockService.listWorkspaces.mockResolvedValue(workspaces);

      await useWorkspaceStore.getState().fetchMyWorkspaces();

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toEqual(workspaces);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears isLoading on failure', async () => {
      mockService.listWorkspaces.mockRejectedValue(
        new Error('Network error'),
      );

      await useWorkspaceStore.getState().fetchMyWorkspaces();

      const state = useWorkspaceStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
      expect(state.workspaces).toEqual([]);
    });

    it('uses fallback error message for non-Error throws', async () => {
      mockService.listWorkspaces.mockRejectedValue('something broke');

      await useWorkspaceStore.getState().fetchMyWorkspaces();

      expect(useWorkspaceStore.getState().error).toBe(
        'Failed to load workspaces',
      );
    });
  });

  describe('createWorkspace', () => {
    it('trims name, calls service, adds workspace, and returns it', async () => {
      const workspace = makeWorkspace({ id: 'ws-new', name: 'New WS' });
      mockService.createWorkspace.mockResolvedValue(workspace);

      const result = await useWorkspaceStore
        .getState()
        .createWorkspace('  New WS  ');

      expect(mockService.createWorkspace).toHaveBeenCalledWith({
        name: 'New WS',
      });
      expect(result).toEqual(workspace);
      expect(useWorkspaceStore.getState().workspaces).toEqual([workspace]);
      expect(useWorkspaceStore.getState().isCreating).toBe(false);
    });

    it('passes iconUrl when provided', async () => {
      const workspace = makeWorkspace({
        id: 'ws-icon',
        iconUrl: 'https://img.test/icon.png',
      });
      mockService.createWorkspace.mockResolvedValue(workspace);

      await useWorkspaceStore
        .getState()
        .createWorkspace('With Icon', 'https://img.test/icon.png');

      expect(mockService.createWorkspace).toHaveBeenCalledWith({
        name: 'With Icon',
        iconUrl: 'https://img.test/icon.png',
      });
    });

    it('returns null and skips service call for empty/whitespace name', async () => {
      const result = await useWorkspaceStore
        .getState()
        .createWorkspace('   ');

      expect(result).toBeNull();
      expect(mockService.createWorkspace).not.toHaveBeenCalled();
      expect(useWorkspaceStore.getState().isCreating).toBe(false);
    });

    it('sets error and returns null on failure', async () => {
      mockService.createWorkspace.mockRejectedValue(
        new Error('Create failed'),
      );

      const result = await useWorkspaceStore
        .getState()
        .createWorkspace('Fail WS');

      expect(result).toBeNull();
      expect(useWorkspaceStore.getState().error).toBe('Create failed');
      expect(useWorkspaceStore.getState().isCreating).toBe(false);
    });
  });

  describe('updateWorkspaceLocal', () => {
    it('patches matching workspace and leaves others unchanged', () => {
      const ws1 = makeWorkspace({ id: 'ws-1', name: 'Original' });
      const ws2 = makeWorkspace({ id: 'ws-2', name: 'Other' });
      useWorkspaceStore.setState({ workspaces: [ws1, ws2] });

      useWorkspaceStore
        .getState()
        .updateWorkspaceLocal('ws-1', { name: 'Updated' });

      const workspaces = useWorkspaceStore.getState().workspaces;
      expect(workspaces[0]).toEqual({ ...ws1, name: 'Updated' });
      expect(workspaces[1]).toEqual(ws2);
    });

    it('does not change workspaces when id does not match', () => {
      const ws1 = makeWorkspace({ id: 'ws-1', name: 'Unchanged' });
      useWorkspaceStore.setState({ workspaces: [ws1] });

      useWorkspaceStore
        .getState()
        .updateWorkspaceLocal('ws-nonexistent', { name: 'Nope' });

      expect(useWorkspaceStore.getState().workspaces).toEqual([ws1]);
    });
  });
});
