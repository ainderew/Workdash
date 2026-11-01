import React, { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from './common/store/_types';

const events = vi.hoisted(() => ({ listener: undefined as undefined | ((scene: unknown) => void), destroy: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));
vi.mock('./game/main', () => ({ default: () => ({ destroy: events.destroy }) }));
vi.mock('./game/EventBus', () => ({ EventBus: {
    on: (_event: string, listener: (scene: unknown) => void) => { events.listener = listener; },
    off: (_event: string, listener: (scene: unknown) => void) => { if (events.listener === listener) events.listener = undefined; },
} }));
import { PhaserGame, type IRefPhaserGame } from './PhaserGame';

describe('real map readiness', () => {
    it('notifies readiness for the actual playable maps and removes its listener on unmount', () => {
        const ready = vi.fn();
        const ref = createRef<IRefPhaserGame>();
        const view = render(<PhaserGame user={{} as User} ref={ref} onGameReady={ready} />);
        act(() => events.listener?.({ scene: { key: 'Preloader' } }));
        expect(ready).not.toHaveBeenCalled();
        const mainMap = { scene: { key: 'MainMap' } };
        act(() => events.listener?.(mainMap));
        expect(ready).toHaveBeenCalledTimes(1);
        expect(ref.current?.scene).toBe(mainMap);
        act(() => events.listener?.({ scene: { key: 'SoccerMap' } }));
        expect(ready).toHaveBeenCalledTimes(2);
        view.unmount();
        expect(events.listener).toBeUndefined();
        expect(events.destroy).toHaveBeenCalledWith(true);
    });
});
