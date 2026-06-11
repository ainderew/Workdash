import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoungeCard from './LoungeCard';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';
import useUserStore from '@/common/store/useStore';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';

vi.mock('@/game/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock('@/communication/callSignaling/callSignalingService', () => ({
  CallSignalingService: {
    getInstance: vi.fn(),
  },
}));

const LOUNGE_ID = 'lounge-room-1';

const mockService = {
  joinCall: vi.fn().mockResolvedValue(null),
  startCall: vi.fn().mockResolvedValue(null),
  leaveCall: vi.fn().mockResolvedValue(undefined),
};

const onlinePresence = {
  statusId: 'online',
  label: 'Online',
  color: 'green',
  icon: null,
  manualLock: false,
};

function setLoungeCall(participants: Array<{ userId: number; displayName: string }>) {
  useCallStore.setState({
    activeCallsByChannel: {
      [LOUNGE_ID]: {
        channelId: LOUNGE_ID,
        type: 'audio',
        startedAt: '2026-06-11T00:00:00Z',
        participants: participants.map((p) => ({
          ...p,
          media: { audio: true, video: false, screen: false },
        })),
      },
    },
  });
}

describe('LoungeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CallSignalingService.getInstance).mockReturnValue(
      mockService as never,
    );
    useCallStore.setState({ activeCallsByChannel: {}, currentCall: null });
    useChatV2Store.setState({
      roomsById: {
        [LOUNGE_ID]: { id: LOUNGE_ID, name: 'dev-break-room' } as never,
      },
    });
    usePresenceStore.setState({ presenceMap: {} });
    useUserStore.setState({ backendUser: { id: 99 } as never });
  });

  it('starts a call and navigates when the lounge is empty', async () => {
    usePresenceStore.setState({
      presenceMap: { 1: onlinePresence, 99: onlinePresence },
    });
    const onSelectRoom = vi.fn();
    render(
      <LoungeCard loungeChannelId={LOUNGE_ID} onSelectRoom={onSelectRoom} />,
    );

    expect(screen.getByText('1 friend online')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /start hanging out in dev-break-room/i,
      }),
    );

    expect(onSelectRoom).toHaveBeenCalledWith(LOUNGE_ID);
    await waitFor(() => expect(mockService.startCall).toHaveBeenCalledWith(LOUNGE_ID));
    expect(mockService.joinCall).not.toHaveBeenCalled();
  });

  it('joins the live call and shows occupants', async () => {
    setLoungeCall([
      { userId: 1, displayName: 'Brett Galvez' },
      { userId: 2, displayName: 'IBan' },
    ]);
    const onSelectRoom = vi.fn();
    render(
      <LoungeCard loungeChannelId={LOUNGE_ID} onSelectRoom={onSelectRoom} />,
    );

    expect(screen.getByText('2 hanging out')).toBeInTheDocument();
    expect(screen.getByTitle('Brett Galvez')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /join the dev-break-room call/i }),
    );

    await waitFor(() => expect(mockService.joinCall).toHaveBeenCalledWith(LOUNGE_ID));
    expect(mockService.startCall).not.toHaveBeenCalled();
  });

  it('leaves the current call before joining the lounge', async () => {
    setLoungeCall([{ userId: 1, displayName: 'Brett Galvez' }]);
    useCallStore.setState({ currentCall: { channelId: 'other-channel' } });
    render(<LoungeCard loungeChannelId={LOUNGE_ID} onSelectRoom={vi.fn()} />);

    fireEvent.click(
      screen.getByRole('button', { name: /join the dev-break-room call/i }),
    );

    await waitFor(() => expect(mockService.joinCall).toHaveBeenCalledWith(LOUNGE_ID));
    expect(mockService.leaveCall).toHaveBeenCalledWith('other-channel');
  });

  it('offers Get up when already sitting in the lounge', async () => {
    setLoungeCall([{ userId: 99, displayName: 'You Person' }]);
    useCallStore.setState({ currentCall: { channelId: LOUNGE_ID } });
    render(<LoungeCard loungeChannelId={LOUNGE_ID} onSelectRoom={vi.fn()} />);

    expect(screen.getByText('You on the couch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Get up' }));

    await waitFor(() => expect(mockService.leaveCall).toHaveBeenCalledWith(LOUNGE_ID));
    expect(mockService.joinCall).not.toHaveBeenCalled();
    expect(mockService.startCall).not.toHaveBeenCalled();
  });
});
