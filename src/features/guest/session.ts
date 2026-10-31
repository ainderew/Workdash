import { CONFIG } from '@/common/utils/config';
import type { CharacterCustomization } from '@/game/character/_types';

export interface GuestSnapshot {
    serverNow: number; selfId: string; appearance: CharacterCustomization; claimed: boolean; draftExpiresAt: number;
    room: { id: string; status: string; expiresAt: number; host: boolean; canSaveRoom: boolean; workspaceId?: string; capacity: number; invite?: string };
    participants: Array<{ id: string; appearance: CharacterCustomization }>;
}
export class GuestRequestError extends Error { constructor(public code: string) { super(code); } }
export async function guestRequest<T = GuestSnapshot>(command: Record<string, unknown>, challenge?: string): Promise<T> {
    const response = await fetch('/api/guest', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Guest-Request': '1' }, body: JSON.stringify({ command, ...(challenge ? { challenge } : {}) }), signal: AbortSignal.timeout(12000) });
    const data = await response.json();
    if (!response.ok) throw new GuestRequestError(data.code || 'UNAVAILABLE');
    return data;
}
export const isGuestGame = () => typeof window !== 'undefined' && window.location.pathname === '/try' && new URLSearchParams(window.location.search).get('play') === '1';
export function guestSocketConnection(role: 'game' | 'media') {
    return {
        url: `${CONFIG.SFU_SERVER_URL.replace(/\/$/, '')}/guest`,
        auth: (callback: (data: Record<string, string>) => void) => {
            void guestRequest<{ ticket: string }>({ action: 'ticket', role })
                .then(data => callback({ guestTicket: data.ticket }))
                .catch(() => { callback({ guestTicket: '' }); window.dispatchEvent(new CustomEvent('guest-ended', { detail: 'UNAVAILABLE' })); });
        },
    };
}
