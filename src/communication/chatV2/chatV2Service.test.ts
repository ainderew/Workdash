import { ChatV2Service } from './chatV2Service';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockOnce = vi.fn();
const mockSocket = {
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
  once: mockOnce,
  connected: true,
};

vi.mock('@/communication/mediaTransportService/mediaTransportServive', () => ({
  MediaTransportService: {
    getInstance: vi.fn(() => ({
      socket: mockSocket,
    })),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
vi.stubGlobal('setTimeout', vi.fn((_fn: () => void) => 999));
vi.stubGlobal('clearTimeout', vi.fn());
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'test-uuid') });

function simulateSuccess(data: unknown) {
  mockEmit.mockImplementation(
    (_event: string, payloadOrCallback: unknown, maybeCallback?: unknown) => {
      const callback =
        typeof payloadOrCallback === 'function'
          ? payloadOrCallback
          : maybeCallback;
      if (typeof callback === 'function') callback({ ok: true, data });
    },
  );
}

function simulateError(error: string) {
  mockEmit.mockImplementation(
    (_event: string, payloadOrCallback: unknown, maybeCallback?: unknown) => {
      const callback =
        typeof payloadOrCallback === 'function'
          ? payloadOrCallback
          : maybeCallback;
      if (typeof callback === 'function') callback({ ok: false, error });
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket.connected = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ChatV2Service as any).instance = undefined;
});

describe('ChatV2Service', () => {
  describe('socket event contracts', () => {
    it('listWorkspaces emits "workspace:list" with callback as the second argument (no payload)', async () => {
      simulateSuccess({ workspaces: [{ id: 'ws-1', name: 'My Workspace' }] });
      const service = ChatV2Service.getInstance();

      const result = await service.listWorkspaces();

      expect(mockEmit).toHaveBeenCalledWith('workspace:list', expect.any(Function));
      expect(mockEmit.mock.calls[0]).toHaveLength(2);
      expect(result).toEqual([{ id: 'ws-1', name: 'My Workspace' }]);
    });

    it('createWorkspace emits "workspace:create" with { name, iconUrl } payload', async () => {
      const workspace = { id: 'ws-2', name: 'New WS', iconUrl: 'https://img.png' };
      simulateSuccess({ workspace });
      const service = ChatV2Service.getInstance();

      const result = await service.createWorkspace({
        name: 'New WS',
        iconUrl: 'https://img.png',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:create',
        { name: 'New WS', iconUrl: 'https://img.png' },
        expect.any(Function),
      );
      expect(result).toEqual(workspace);
    });

    it('joinWorkspaceByInvite emits "workspace:invite:join" with { code }', async () => {
      const workspace = { id: 'ws-3', name: 'Invited WS' };
      simulateSuccess({ workspace });
      const service = ChatV2Service.getInstance();

      const result = await service.joinWorkspaceByInvite('ABC123');

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:invite:join',
        { code: 'ABC123' },
        expect.any(Function),
      );
      expect(result).toEqual(workspace);
    });

    it('createWorkspaceRole emits "workspace:role:create" with workspaceId, name, permissions', async () => {
      const role = { id: 'role-1', name: 'Mod', permissions: '0x01' };
      simulateSuccess({ role });
      const service = ChatV2Service.getInstance();

      const result = await service.createWorkspaceRole('ws-1', {
        name: 'Mod',
        permissions: '0x01',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:role:create',
        { workspaceId: 'ws-1', name: 'Mod', permissions: '0x01' },
        expect.any(Function),
      );
      expect(result).toEqual(role);
    });

    it('listWorkspaceRoles emits "workspace:role:list" with workspaceId', async () => {
      const roles = [
        { id: 'role-1', name: '@everyone', permissions: '0', isEveryone: true },
        { id: 'role-2', name: 'Mod', permissions: '32', isEveryone: false },
      ];
      simulateSuccess({ roles });
      const service = ChatV2Service.getInstance();

      const result = await service.listWorkspaceRoles('ws-1');

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:role:list',
        { workspaceId: 'ws-1' },
        expect.any(Function),
      );
      expect(result).toEqual(roles);
    });

    it('updateWorkspaceRole emits "workspace:role:update" with workspaceId, roleId, and update fields', async () => {
      const role = { id: 'role-2', name: 'Admin', permissions: '255', isEveryone: false };
      simulateSuccess({ role });
      const service = ChatV2Service.getInstance();

      const result = await service.updateWorkspaceRole('ws-1', 'role-2', {
        name: 'Admin',
        permissions: '255',
        color: 0xED4245,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:role:update',
        {
          workspaceId: 'ws-1',
          roleId: 'role-2',
          name: 'Admin',
          permissions: '255',
          color: 0xED4245,
        },
        expect.any(Function),
      );
      expect(result).toEqual(role);
    });

    it('deleteWorkspaceRole emits "workspace:role:delete" with workspaceId and roleId', async () => {
      simulateSuccess({ success: true });
      const service = ChatV2Service.getInstance();

      await service.deleteWorkspaceRole('ws-1', 'role-2');

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:role:delete',
        { workspaceId: 'ws-1', roleId: 'role-2' },
        expect.any(Function),
      );
    });

    it('assignWorkspaceRole emits "workspace:role:assign" with workspaceId, targetUserId, roleId', async () => {
      simulateSuccess({ success: true });
      const service = ChatV2Service.getInstance();

      await service.assignWorkspaceRole('ws-1', 42, 'role-2');

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:role:assign',
        { workspaceId: 'ws-1', targetUserId: 42, roleId: 'role-2' },
        expect.any(Function),
      );
    });

    it('removeWorkspaceRole emits "workspace:role:remove" with workspaceId, targetUserId, roleId', async () => {
      simulateSuccess({ success: true });
      const service = ChatV2Service.getInstance();

      await service.removeWorkspaceRole('ws-1', 42, 'role-2');

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:role:remove',
        { workspaceId: 'ws-1', targetUserId: 42, roleId: 'role-2' },
        expect.any(Function),
      );
    });

    it('createWorkspaceRole sends default permissions when provided', async () => {
      const role = { id: 'role-3', name: 'New Role', permissions: '4194303', isEveryone: false };
      simulateSuccess({ role });
      const service = ChatV2Service.getInstance();

      const result = await service.createWorkspaceRole('ws-1', {
        name: 'New Role',
        permissions: '4194303',
        color: 0x5865F2,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:role:create',
        {
          workspaceId: 'ws-1',
          name: 'New Role',
          permissions: '4194303',
          color: 0x5865F2,
        },
        expect.any(Function),
      );
      expect(result).toEqual(role);
    });

    it('setChannelOverwrite emits "workspace:channel:overwrite:set" with all fields', async () => {
      const overwrite = {
        id: 'ow-1',
        targetId: 'role-1',
        targetType: 0,
        allow: '0x04',
        deny: '0x00',
      };
      simulateSuccess({ overwrite });
      const service = ChatV2Service.getInstance();

      const result = await service.setChannelOverwrite('ws-1', 'ch-1', {
        targetId: 'role-1',
        targetType: 0,
        allow: '0x04',
        deny: '0x00',
      });

      expect(mockEmit).toHaveBeenCalledWith(
        'workspace:channel:overwrite:set',
        {
          workspaceId: 'ws-1',
          channelId: 'ch-1',
          targetId: 'role-1',
          targetType: 0,
          allow: '0x04',
          deny: '0x00',
        },
        expect.any(Function),
      );
      expect(result).toEqual(overwrite);
    });

    it('createMessage emits "chat:v2:message:create" with roomId, clientMessageId, content', async () => {
      const message = { id: 'msg-1', content: 'hello', roomId: 'room-1' };
      simulateSuccess({ message, deduplicated: false });
      const service = ChatV2Service.getInstance();

      const result = await service.createMessage('room-1', 'hello');

      expect(mockEmit).toHaveBeenCalledWith(
        'chat:v2:message:create',
        {
          roomId: 'room-1',
          clientMessageId: 'test-uuid',
          content: 'hello',
        },
        expect.any(Function),
      );
      expect(result).toEqual({ message, everyoneMentionSuppressed: undefined });
    });

    it('createMessage with a standalone gif URL sets messageType to "IMAGE"', async () => {
      const gifUrl = 'https://media.giphy.com/media/abc/giphy.gif';
      const message = { id: 'msg-2', content: gifUrl, messageType: 'IMAGE' };
      simulateSuccess({ message, deduplicated: false });
      const service = ChatV2Service.getInstance();

      await service.createMessage('room-1', gifUrl);

      expect(mockEmit).toHaveBeenCalledWith(
        'chat:v2:message:create',
        {
          roomId: 'room-1',
          clientMessageId: 'test-uuid',
          content: gifUrl,
          messageType: 'IMAGE',
        },
        expect.any(Function),
      );
    });

    it('deleteMessage emits "chat:v2:message:delete" with roomId and messageId', async () => {
      const deleteResponse = {
        messageId: 'msg-1',
        roomId: 'room-1',
        deletedAt: '2026-03-02T00:00:00.000Z',
      };
      simulateSuccess(deleteResponse);
      const service = ChatV2Service.getInstance();

      const result = await service.deleteMessage('room-1', 'msg-1');

      expect(mockEmit).toHaveBeenCalledWith(
        'chat:v2:message:delete',
        { roomId: 'room-1', messageId: 'msg-1' },
        expect.any(Function),
      );
      expect(result).toEqual(deleteResponse);
    });
  });

  describe('error handling', () => {
    it('emitWithAck rejects when response is { ok: false, error }', async () => {
      simulateError('Permission denied');
      const service = ChatV2Service.getInstance();

      await expect(service.listWorkspaces()).rejects.toThrow('Permission denied');
    });

    it('emitWithAck waits for connect when socket is disconnected', async () => {
      mockSocket.connected = false;
      simulateSuccess([]);
      const service = ChatV2Service.getInstance();

      // Should register a 'connect' listener instead of rejecting
      const promise = service.listWorkspaces();
      expect(mockOnce).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockEmit).not.toHaveBeenCalled();

      // Simulate the socket connecting
      const connectCb = mockOnce.mock.calls.find(
        (c: unknown[]) => c[0] === 'connect',
      )?.[1] as () => void;
      connectCb();

      await promise;
      expect(mockEmit).toHaveBeenCalled();
    });
  });

  describe('realtime handlers', () => {
    const EXPECTED_EVENTS = [
      'chat:v2:message:new',
      'chat:v2:message:update',
      'chat:v2:message:delete',
      'chat:v2:message:reaction:update',
      'chat:v2:notification:new',
      'chat:v2:message:reaction:super:update',
      'chat:v2:message:pin:new',
      'chat:v2:message:pin:removed',
      'chat:v2:typing:update',
      'chat:v2:typing:stop',
      'achievement:unlocked',
    ];

    it('setupRealtimeHandlers registers the correct event names', () => {
      const service = ChatV2Service.getInstance();

      service.setupRealtimeHandlers({
        onMessageNew: vi.fn(),
        onMessageUpdate: vi.fn(),
        onMessageDelete: vi.fn(),
        onMessageReactionUpdate: vi.fn(),
        onNotificationNew: vi.fn(),
        onMessagePinNew: vi.fn(),
        onMessagePinRemoved: vi.fn(),
      });

      const registeredEvents = mockOn.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(registeredEvents).toEqual(EXPECTED_EVENTS);
      expect(mockOn).toHaveBeenCalledTimes(11);
    });

    it('setupRealtimeHandlers teardown removes all event listeners', () => {
      const service = ChatV2Service.getInstance();

      const teardown = service.setupRealtimeHandlers({
        onMessageNew: vi.fn(),
        onMessageUpdate: vi.fn(),
        onMessageDelete: vi.fn(),
      });

      teardown();

      const removedEvents = mockOff.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(removedEvents).toEqual(EXPECTED_EVENTS);
      expect(mockOff).toHaveBeenCalledTimes(11);

      // Each off call should pass the same handler reference that was registered
      for (let i = 0; i < EXPECTED_EVENTS.length; i++) {
        const onHandler = mockOn.mock.calls[i][1];
        const offHandler = mockOff.mock.calls[i][1];
        expect(offHandler).toBe(onHandler);
      }
    });

    it('calling setupRealtimeHandlers twice tears down previous handlers', () => {
      const service = ChatV2Service.getInstance();

      service.setupRealtimeHandlers({
        onMessageNew: vi.fn(),
        onMessageUpdate: vi.fn(),
        onMessageDelete: vi.fn(),
      });

      expect(mockOff).not.toHaveBeenCalled();

      // Second call should tear down the first set of handlers
      service.setupRealtimeHandlers({
        onMessageNew: vi.fn(),
        onMessageUpdate: vi.fn(),
        onMessageDelete: vi.fn(),
      });

      // The first set of handlers should have been removed
      expect(mockOff).toHaveBeenCalledTimes(11);
      const removedEvents = mockOff.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(removedEvents).toEqual(EXPECTED_EVENTS);

      // And the second set should be registered (total 20 on calls)
      expect(mockOn).toHaveBeenCalledTimes(22);
    });
  });
});
