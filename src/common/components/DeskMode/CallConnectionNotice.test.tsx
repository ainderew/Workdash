import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let mockState = {
  mediaConnectionState: 'connected' as
    | 'connected'
    | 'reconnecting'
    | 'lost',
  currentCall: { channelId: 'c1' } as { channelId: string } | null,
};

vi.mock('@/common/store/callStore', () => ({
  default: vi.fn((selector: (s: typeof mockState) => unknown) =>
    selector(mockState),
  ),
}));

import CallConnectionNotice from './CallConnectionNotice';

beforeEach(() => {
  mockState = {
    mediaConnectionState: 'connected',
    currentCall: { channelId: 'c1' },
  };
});

describe('CallConnectionNotice', () => {
  it('renders nothing while connected', () => {
    const { container } = render(<CallConnectionNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when not in a call, even if state is degraded', () => {
    mockState.currentCall = null;
    mockState.mediaConnectionState = 'reconnecting';
    const { container } = render(<CallConnectionNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a reconnecting message when the media path drops', () => {
    mockState.mediaConnectionState = 'reconnecting';
    render(<CallConnectionNotice />);
    expect(screen.getByRole('status')).toHaveTextContent(/reconnecting/i);
  });

  it('shows a connection-lost message on hard failure', () => {
    mockState.mediaConnectionState = 'lost';
    render(<CallConnectionNotice />);
    expect(screen.getByRole('status')).toHaveTextContent(/connection lost/i);
  });
});
