import useChatV2Store from './chatV2Store';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/game/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

const mockService = {
  setupRealtimeHandlers: vi.fn().mockReturnValue(vi.fn()),
  listRooms: vi.fn().mockResolvedValue([]),
  listCategories: vi.fn().mockResolvedValue([]),
  joinRoom: vi.fn().mockResolvedValue({ id: 'room-1', name: 'general' }),
  listMessages: vi.fn().mockResolvedValue([]),
  listDirectRooms: vi.fn().mockResolvedValue([]),
  listFriends: vi.fn().mockResolvedValue([]),
  listNotifications: vi
    .fn()
    .mockResolvedValue({ notifications: [], unreadCount: 0 }),
  listFrequentEmojis: vi.fn().mockResolvedValue([]),
  updateReadCursor: vi.fn().mockResolvedValue(undefined),
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  createRoom: vi.fn(),
  deleteRoom: vi.fn(),
  updateRoom: vi.fn(),
  createCategory: vi.fn(),
  listRoomMembers: vi.fn().mockResolvedValue([]),
  listPinnedMessages: vi.fn().mockResolvedValue([]),
  selectWorkspace: vi.fn(),
};

vi.mock('@/communication/chatV2/chatV2Service', () => ({
  ChatV2Service: {
    getInstance: vi.fn(() => mockService),
  },
}));

vi.mock('@/communication/chatV2/reactionFrequentCache', () => ({
  readFrequentEmojiLocal: vi.fn().mockReturnValue([]),
  writeFrequentEmojiLocal: vi.fn(),
  bumpFrequentEmojiLocal: vi.fn().mockReturnValue([]),
  mergeFrequentEmojiSources: vi.fn().mockReturnValue([]),
}));

vi.mock('@/common/utils/displayName', () => ({
  getDisplayName: vi.fn(
    (_user: unknown, fallback: string) => fallback ?? 'Unknown',
  ),
}));

// ---------------------------------------------------------------------------
// Helpers / Factories
// ---------------------------------------------------------------------------

type ChatV2Room = {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  position: number;
  name: string;
  slug: string;
  topic: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  type: 'TEXT' | 'VOICE' | 'ANNOUNCEMENT' | 'DIRECT';
  isArchived: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  viewerRole?:
    | 'OWNER'
    | 'ADMIN'
    | 'MODERATOR'
    | 'MEMBER'
    | 'READ_ONLY'
    | null;
  unreadCount?: number;
  category?: ChatV2RoomCategory | null;
};

type ChatV2RoomCategory = {
  id: string;
  workspaceId: string;
  name: string;
  position: number;
  createdByUserId: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ChatV2Message = {
  id: string;
  roomId: string;
  senderUserId: number;
  clientMessageId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  replyToMessageId: string | null;
  editedAt: string | Date | null;
  deletedAt: string | Date | null;
  createdAt: string | Date;
  attachments: [];
  reactions?: [];
};

const makeRoom = (overrides: Partial<ChatV2Room> = {}): ChatV2Room => ({
  id: 'room-1',
  workspaceId: 'ws-1',
  categoryId: null,
  position: 0,
  name: 'general',
  slug: 'general',
  topic: null,
  visibility: 'PUBLIC',
  type: 'TEXT',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  unreadCount: 0,
  ...overrides,
});

const makeCategory = (
  overrides: Partial<ChatV2RoomCategory> = {},
): ChatV2RoomCategory => ({
  id: 'cat-1',
  workspaceId: 'ws-1',
  name: 'General',
  position: 0,
  createdByUserId: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeMessage = (
  overrides: Partial<ChatV2Message> = {},
): ChatV2Message => ({
  id: 'msg-1',
  roomId: 'room-1',
  senderUserId: 2,
  clientMessageId: 'client-msg-1',
  content: 'hello world',
  messageType: 'TEXT',
  replyToMessageId: null,
  editedAt: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  attachments: [],
  reactions: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Reset state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useChatV2Store.setState({
    initialized: false,
    railView: 'server',
    selectedWorkspaceId: null,
    isLoadingRooms: false,
    isLoadingDirectRooms: false,
    isLoadingFriends: false,
    isLoadingFriendRequests: false,
    isLoadingNotifications: false,
    isLoadingMessages: false,
    isLoadingOlderMessages: false,
    hasMoreMessagesByRoomId: {},
    isSending: false,
    isCreatingRoom: false,
    isCreatingCategory: false,
    isArrangingRooms: false,
    isUpdatingRoom: false,
    isManagingMembers: false,
    error: null,
    roomsById: {},
    roomOrder: [],
    unreadByRoomId: {},
    directRoomsById: {},
    directRoomOrder: [],
    frequentEmojis: [],
    reactionReactorsCache: {},
    friends: [],
    friendRequests: [],
    notifications: [],
    categoriesById: {},
    categoryOrder: [],
    currentRoomId: null,
    messagesByRoomId: {},
    membersByRoomId: {},
    pinnedMessagesByRoomId: {},
    isLoadingPinnedMessages: false,
  });

  vi.clearAllMocks();

  // Re-apply default resolved values after clearAllMocks
  mockService.setupRealtimeHandlers.mockReturnValue(vi.fn());
  mockService.listRooms.mockResolvedValue([]);
  mockService.listCategories.mockResolvedValue([]);
  mockService.joinRoom.mockResolvedValue({ id: 'room-1', name: 'general' });
  mockService.listMessages.mockResolvedValue([]);
  mockService.listDirectRooms.mockResolvedValue([]);
  mockService.listFriends.mockResolvedValue([]);
  mockService.listNotifications.mockResolvedValue({
    notifications: [],
    unreadCount: 0,
  });
  mockService.listFrequentEmojis.mockResolvedValue([]);
  mockService.updateReadCursor.mockResolvedValue(undefined);
  mockService.listRoomMembers.mockResolvedValue([]);
  mockService.listPinnedMessages.mockResolvedValue([]);
  mockService.selectWorkspace.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useChatV2Store', () => {
  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('starts with empty roomsById, empty messagesByRoomId, and null currentRoomId', () => {
      const state = useChatV2Store.getState();

      expect(state.roomsById).toEqual({});
      expect(state.messagesByRoomId).toEqual({});
      expect(state.currentRoomId).toBeNull();
      expect(state.error).toBeNull();
      expect(state.selectedWorkspaceId).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Room operations
  // -----------------------------------------------------------------------
  describe('room operations', () => {
    it('populates roomsById and roomOrder after reloadRoomStructure', async () => {
      const rooms = [
        makeRoom({ id: 'room-1', name: 'general', position: 0 }),
        makeRoom({ id: 'room-2', name: 'random', position: 1 }),
      ];
      mockService.listRooms.mockResolvedValue(rooms);

      useChatV2Store.setState({ selectedWorkspaceId: 'ws-1' });
      await useChatV2Store.getState().reloadRoomStructure();

      const state = useChatV2Store.getState();
      expect(state.roomsById['room-1']).toMatchObject({ id: 'room-1', name: 'general' });
      expect(state.roomsById['room-2']).toMatchObject({ id: 'room-2', name: 'random' });
      expect(state.roomOrder).toContain('room-1');
      expect(state.roomOrder).toContain('room-2');
    });

    it('adds new room to roomsById after createRoom', async () => {
      const newRoom = makeRoom({ id: 'room-new', name: 'new-channel' });
      mockService.createRoom.mockResolvedValue(newRoom);
      // After createRoom, reloadRoomStructure is called, then selectRoom
      mockService.listRooms.mockResolvedValue([newRoom]);
      mockService.joinRoom.mockResolvedValue(newRoom);

      useChatV2Store.setState({ selectedWorkspaceId: 'ws-1' });
      await useChatV2Store.getState().createRoom({ name: 'new-channel' });

      const state = useChatV2Store.getState();
      expect(state.roomsById['room-new']).toMatchObject({
        id: 'room-new',
        name: 'new-channel',
      });
    });
  });

  // -----------------------------------------------------------------------
  // Message operations
  // -----------------------------------------------------------------------
  describe('message operations', () => {
    it('populates messages for the room after selectRoom', async () => {
      const room = makeRoom({ id: 'room-1' });
      useChatV2Store.setState({
        roomsById: { 'room-1': room },
        roomOrder: ['room-1'],
      });

      const messages = [
        makeMessage({ id: 'msg-1', roomId: 'room-1', content: 'first' }),
        makeMessage({ id: 'msg-2', roomId: 'room-1', content: 'second' }),
      ];
      mockService.listMessages.mockResolvedValue(messages);
      mockService.joinRoom.mockResolvedValue(room);

      await useChatV2Store.getState().selectRoom('room-1');

      const state = useChatV2Store.getState();
      expect(state.messagesByRoomId['room-1']).toHaveLength(2);
      expect(state.messagesByRoomId['room-1']![0].content).toBe('first');
      expect(state.messagesByRoomId['room-1']![1].content).toBe('second');
    });

    it('adds message returned by service to the room messages after sendMessage', async () => {
      const room = makeRoom({ id: 'room-1' });
      useChatV2Store.setState({
        roomsById: { 'room-1': room },
        roomOrder: ['room-1'],
        currentRoomId: 'room-1',
        messagesByRoomId: { 'room-1': [] },
      });

      const sentMessage = makeMessage({
        id: 'msg-sent',
        roomId: 'room-1',
        content: 'hello',
      });
      mockService.createMessage.mockResolvedValue({ message: sentMessage, everyoneMentionSuppressed: false });

      const result = await useChatV2Store.getState().sendMessage('hello');

      expect(result).toMatchObject({ id: 'msg-sent', content: 'hello' });
      const state = useChatV2Store.getState();
      expect(state.messagesByRoomId['room-1']).toHaveLength(1);
      expect(state.messagesByRoomId['room-1']![0].id).toBe('msg-sent');
    });

    it('returns null when sendMessage is called with empty content', async () => {
      useChatV2Store.setState({ currentRoomId: 'room-1' });

      const result = await useChatV2Store.getState().sendMessage('   ');

      expect(result).toBeNull();
      expect(mockService.createMessage).not.toHaveBeenCalled();
    });

    it('returns null when sendMessage has no currentRoomId', async () => {
      useChatV2Store.setState({ currentRoomId: null });

      const result = await useChatV2Store.getState().sendMessage('hello');

      expect(result).toBeNull();
      expect(mockService.createMessage).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Category operations
  // -----------------------------------------------------------------------
  describe('category operations', () => {
    it('populates categoriesById after reloadRoomStructure with workspace', async () => {
      const room = makeRoom({
        id: 'room-1',
        workspaceId: 'ws-1',
        categoryId: 'cat-1',
      });
      const category = makeCategory({ id: 'cat-1', name: 'General' });

      mockService.listRooms.mockResolvedValue([room]);
      mockService.listCategories.mockResolvedValue([category]);

      useChatV2Store.setState({ selectedWorkspaceId: 'ws-1' });

      await useChatV2Store.getState().reloadRoomStructure();

      const state = useChatV2Store.getState();
      expect(state.categoriesById['cat-1']).toMatchObject({
        id: 'cat-1',
        name: 'General',
      });
      expect(state.categoryOrder).toContain('cat-1');
    });
  });

  // -----------------------------------------------------------------------
  // Realtime handlers
  // -----------------------------------------------------------------------
  describe('realtime handlers', () => {
    it('adds message to the correct room via onMessageNew callback', async () => {
      mockService.listRooms.mockResolvedValue([
        makeRoom({ id: 'room-1' }),
      ]);

      await useChatV2Store.getState().initialize();

      const handlers =
        mockService.setupRealtimeHandlers.mock.calls[0][0];

      const newMessage = makeMessage({
        id: 'rt-msg-1',
        roomId: 'room-1',
        content: 'realtime hello',
        senderUserId: 2,
      });

      handlers.onMessageNew(newMessage);

      const state = useChatV2Store.getState();
      expect(state.messagesByRoomId['room-1']).toHaveLength(1);
      expect(state.messagesByRoomId['room-1']![0].content).toBe(
        'realtime hello',
      );
    });

    it('sets deletedAt on the message via onMessageDelete callback', async () => {
      await useChatV2Store.getState().initialize();

      const handlers =
        mockService.setupRealtimeHandlers.mock.calls[0][0];

      // Seed a message first
      const existingMessage = makeMessage({
        id: 'msg-del',
        roomId: 'room-1',
        content: 'to be deleted',
      });
      useChatV2Store.setState({
        messagesByRoomId: { 'room-1': [existingMessage] },
      });

      const deletedAt = '2026-01-02T00:00:00.000Z';
      handlers.onMessageDelete({
        roomId: 'room-1',
        messageId: 'msg-del',
        deletedAt,
      });

      const state = useChatV2Store.getState();
      expect(state.messagesByRoomId['room-1']![0].deletedAt).toBe(
        deletedAt,
      );
      expect(state.messagesByRoomId['room-1']![0].content).toBe('');
    });

    it('increments unread count for non-active room via onMessageNew', async () => {
      const rooms = [
        makeRoom({ id: 'room-1', unreadCount: 0 }),
        makeRoom({ id: 'room-2', unreadCount: 0 }),
      ];
      mockService.listRooms.mockResolvedValue(rooms);

      await useChatV2Store.getState().initialize();

      // selectRoom sets currentRoomId to room-1
      useChatV2Store.setState({ currentRoomId: 'room-1' });

      const handlers =
        mockService.setupRealtimeHandlers.mock.calls[0][0];

      // Message arrives in room-2 (not currently active), from a different user
      const incomingMessage = makeMessage({
        id: 'rt-msg-unread',
        roomId: 'room-2',
        content: 'hey',
        senderUserId: 99,
      });
      handlers.onMessageNew(incomingMessage);

      const state = useChatV2Store.getState();
      expect(state.unreadByRoomId['room-2']).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Initialize
  // -----------------------------------------------------------------------
  describe('initialize', () => {
    it('sets initialized to true after successful initialization', async () => {
      expect(useChatV2Store.getState().initialized).toBe(false);

      await useChatV2Store.getState().initialize();

      expect(useChatV2Store.getState().initialized).toBe(true);
    });

    it('does not re-initialize if already initialized', async () => {
      await useChatV2Store.getState().initialize();
      vi.clearAllMocks();

      await useChatV2Store.getState().initialize();

      expect(mockService.setupRealtimeHandlers).not.toHaveBeenCalled();
    });

    it('sets error when initialization fails', async () => {
      mockService.listRooms.mockRejectedValue(new Error('Network failure'));

      useChatV2Store.setState({ selectedWorkspaceId: 'ws-1' });
      await useChatV2Store.getState().initialize();

      const state = useChatV2Store.getState();
      expect(state.error).toBe('Network failure');
      expect(state.initialized).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Unread tracking
  // -----------------------------------------------------------------------
  describe('unread tracking', () => {
    it('clears unread for a room after selectRoom', async () => {
      const room = makeRoom({ id: 'room-1', unreadCount: 5 });
      useChatV2Store.setState({
        roomsById: { 'room-1': room },
        roomOrder: ['room-1'],
        unreadByRoomId: { 'room-1': 5 },
      });

      mockService.joinRoom.mockResolvedValue(room);
      mockService.listMessages.mockResolvedValue([]);

      await useChatV2Store.getState().selectRoom('room-1');

      const state = useChatV2Store.getState();
      expect(state.unreadByRoomId['room-1']).toBe(0);
    });

    it('clears unread for a room after markRoomRead', async () => {
      useChatV2Store.setState({
        unreadByRoomId: { 'room-1': 3 },
      });

      await useChatV2Store.getState().markRoomRead('room-1', 'msg-last');

      const state = useChatV2Store.getState();
      expect(state.unreadByRoomId['room-1']).toBe(0);
      expect(mockService.updateReadCursor).toHaveBeenCalledWith(
        'room-1',
        'msg-last',
      );
    });

    it('returns correct count from getRoomUnreadCount', () => {
      useChatV2Store.setState({
        unreadByRoomId: { 'room-1': 7, 'room-2': 0 },
      });

      expect(useChatV2Store.getState().getRoomUnreadCount('room-1')).toBe(
        7,
      );
      expect(useChatV2Store.getState().getRoomUnreadCount('room-2')).toBe(
        0,
      );
      expect(
        useChatV2Store.getState().getRoomUnreadCount('nonexistent'),
      ).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // State isolation
  // -----------------------------------------------------------------------
  describe('state isolation', () => {
    it('messages for one room do not affect another room', async () => {
      const room1 = makeRoom({ id: 'room-1' });
      const room2 = makeRoom({ id: 'room-2' });
      useChatV2Store.setState({
        roomsById: { 'room-1': room1, 'room-2': room2 },
        roomOrder: ['room-1', 'room-2'],
      });

      // Select room-1 and load its messages
      const room1Messages = [
        makeMessage({ id: 'msg-r1', roomId: 'room-1', content: 'room1 msg' }),
      ];
      mockService.listMessages.mockResolvedValue(room1Messages);
      mockService.joinRoom.mockResolvedValue(room1);
      await useChatV2Store.getState().selectRoom('room-1');

      // Select room-2 with different messages
      const room2Messages = [
        makeMessage({ id: 'msg-r2', roomId: 'room-2', content: 'room2 msg' }),
      ];
      mockService.listMessages.mockResolvedValue(room2Messages);
      mockService.joinRoom.mockResolvedValue(room2);
      await useChatV2Store.getState().selectRoom('room-2');

      const state = useChatV2Store.getState();
      expect(state.messagesByRoomId['room-1']).toHaveLength(1);
      expect(state.messagesByRoomId['room-1']![0].content).toBe('room1 msg');
      expect(state.messagesByRoomId['room-2']).toHaveLength(1);
      expect(state.messagesByRoomId['room-2']![0].content).toBe('room2 msg');
    });

    it('deleteRoom removes the room from roomsById', async () => {
      const room1 = makeRoom({ id: 'room-1', name: 'general', position: 0 });
      const room2 = makeRoom({ id: 'room-2', name: 'random', position: 1 });
      useChatV2Store.setState({
        selectedWorkspaceId: 'ws-1',
        roomsById: { 'room-1': room1, 'room-2': room2 },
        roomOrder: ['room-1', 'room-2'],
        currentRoomId: 'room-1',
        messagesByRoomId: {
          'room-1': [makeMessage({ id: 'msg-1', roomId: 'room-1' })],
        },
      });

      mockService.deleteRoom.mockResolvedValue(undefined);
      // After delete, reloadRoomStructure returns only room-2
      mockService.listRooms.mockResolvedValue([room2]);
      mockService.joinRoom.mockResolvedValue(room2);

      await useChatV2Store.getState().deleteRoom('room-1');

      const state = useChatV2Store.getState();
      expect(state.roomsById['room-1']).toBeUndefined();
      expect(state.roomsById['room-2']).toBeDefined();
      expect(state.messagesByRoomId['room-1']).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Direct / rename operations
  // -----------------------------------------------------------------------
  describe('rename operations', () => {
    it('renameRoom updates room name in roomsById', async () => {
      const room = makeRoom({ id: 'room-1', name: 'old-name' });
      useChatV2Store.setState({
        selectedWorkspaceId: 'ws-1',
        roomsById: { 'room-1': room },
        roomOrder: ['room-1'],
      });

      mockService.updateRoom.mockResolvedValue(undefined);
      // After rename, reloadRoomStructure returns the updated room
      const updatedRoom = makeRoom({ id: 'room-1', name: 'new-name' });
      mockService.listRooms.mockResolvedValue([updatedRoom]);

      await useChatV2Store.getState().renameRoom('room-1', 'new-name');

      const state = useChatV2Store.getState();
      expect(state.roomsById['room-1'].name).toBe('new-name');
      expect(mockService.updateRoom).toHaveBeenCalledWith(
        'room-1',
        'new-name',
      );
    });
  });
});
