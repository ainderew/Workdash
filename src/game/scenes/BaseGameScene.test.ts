import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('phaser', async () => {
    const { default: EventEmitter } = await import('eventemitter3');
    return { Scene: class { events = new EventEmitter(); }, Events: { EventEmitter } };
});
vi.mock('../player/player', () => ({ Player: vi.fn() }));
vi.mock('../multiplayer/multiplayer', () => ({ Multiplayer: vi.fn() }));
vi.mock('../character/CharacterCompositor', () => ({ CharacterCompositor: vi.fn() }));
vi.mock('../character/CharacterAnimationManager', () => ({ CharacterAnimationManager: vi.fn() }));
vi.mock('../audio/BackgroundMusicManager', () => ({ BackgroundMusicManager: vi.fn() }));
vi.mock('../managers/TeleportManager', () => ({ TeleportManager: vi.fn() }));
vi.mock('../audioZoneManager/audioZoneManager', () => ({ AudioZoneManager: class { initializeZones = vi.fn(); destroy = vi.fn(); } }));
vi.mock('@/common/store/chatV2Store', () => ({ default: { getState: () => ({ selectedWorkspaceId: 'workspace' }) } }));
import { BaseGameScene } from './BaseGameScene';
import { EventBus } from '../EventBus';

function fixture() {
    class TestScene extends BaseGameScene { mapKey = 'map'; worldBounds = { width: 100, height: 100 }; }
    const scene = new TestScene('MainMap');
    const multiplayer = { joinGame: vi.fn(), switchWorkspace: vi.fn(), setCurrentScene: vi.fn(), removeAllGameListeners: vi.fn() };
    const cleanup = vi.fn();
    Object.assign(scene, {
        scene: { key: 'MainMap' }, cameras: { main: { fadeIn: vi.fn() } },
        physics: { add: { group: vi.fn() } }, multiplayer,
        audioZoneManager: { destroy: cleanup },
        setupCamera: vi.fn(), setupMultiplayer: vi.fn(), createAnimations: vi.fn(),
        loadMap: vi.fn(() => ({})), createLayers: vi.fn(), setupPhysicsWorld: vi.fn(),
        createAnimatedObjects: vi.fn(), createDoors: vi.fn(), setupCollisions: vi.fn(),
        setupTeleports: vi.fn(), setupAudio: vi.fn(), setupMultiplayerWatchers: vi.fn(), setupChatBlur: vi.fn(),
    });
    return { scene, multiplayer, cleanup };
}
afterEach(() => EventBus.removeAllListeners());
describe('Phaser scene ownership of global listeners', () => {
    it.each(['shutdown', 'destroy'])('releases workspace listeners on %s and cleans up once', event => {
        const { scene, multiplayer, cleanup } = fixture();
        scene.create();
        expect(EventBus.listenerCount('workspace-switch')).toBe(1);
        scene.events.emit(event);
        scene.events.emit('destroy');
        expect(EventBus.listenerCount('workspace-switch')).toBe(0);
        expect(EventBus.listenerCount('teleport')).toBe(0);
        expect(cleanup).toHaveBeenCalledTimes(1);
        EventBus.emit('workspace-switch', { workspaceId: 'after-destroy' });
        expect(multiplayer.switchWorkspace).not.toHaveBeenCalled();
    });
    it('restarts without duplicate listeners or retaining a previous joined-game flag', () => {
        const { scene, multiplayer } = fixture();
        scene.create(); scene.events.emit('shutdown'); scene.create();
        expect(EventBus.listenerCount('workspace-switch')).toBe(1);
        expect(multiplayer.joinGame).toHaveBeenCalledTimes(2);
        scene.events.emit('shutdown');
        expect(EventBus.listenerCount('workspace-switch')).toBe(0);
    });
});
