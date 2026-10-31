import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'unauthenticated' }) }));
vi.mock('next/dynamic', () => ({ default: () => () => <div>Real platform placeholder</div> }));
vi.mock('@/common/components/CharacterCreation/CharacterCreationScreen', () => ({ CharacterCreationScreen: () => null }));
vi.mock('./Challenge', () => ({ Challenge: () => null }));
vi.mock('./funnel', () => ({ guestFunnelEvent: vi.fn() }));
vi.mock('./session', () => ({ guestRequest: request, isGuestGame: () => true, GuestRequestError: class extends Error {} }));
import GuestEntry from './GuestEntry';

const draft = { selfId: 'host', serverNow: 1000, participants: [], room: { id: 'room', status: 'active', expiresAt: 1201000, capacity: 8, host: true, canSaveRoom: true, invite: 'fixture' } };
beforeEach(() => {
    request.mockResolvedValue(draft);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true }) }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('guest room ending', () => {
    it('removes re-entry after a server end event even when the last snapshot was active', async () => {
        render(<GuestEntry />);
        await screen.findByRole('button', { name: 'Leave' });
        act(() => window.dispatchEvent(new CustomEvent('guest-ended', { detail: 'ROOM_ENDED' })));
        expect(screen.queryByRole('button', { name: 'Return to room' })).toBeNull();
        expect(screen.queryByText('Real platform placeholder')).toBeNull();
        expect(screen.getByRole('button', { name: 'Sign in to save' })).toBeTruthy();
    });
    it('still allows a voluntary leaver to return while the server room is active', async () => {
        render(<GuestEntry />);
        fireEvent.click(await screen.findByRole('button', { name: 'Leave' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Return to room' })).toBeTruthy());
    });
});
