import { buildTileData, tileKey } from './buildTileData';
import type { CallParticipant, CallParticipantMedia } from '@/common/store/callStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParticipant(
  userId: number,
  media: Partial<CallParticipantMedia> = {},
): CallParticipant {
  return {
    userId,
    displayName: `User ${userId}`,
    media: { audio: false, video: false, screen: false, ...media },
  };
}

// ---------------------------------------------------------------------------
// tileKey
// ---------------------------------------------------------------------------

describe('tileKey', () => {
  it('returns userId string for camera tile', () => {
    expect(tileKey(42)).toBe('42');
    expect(tileKey(42, false)).toBe('42');
  });

  it('returns userId-screen for screen tile', () => {
    expect(tileKey(42, true)).toBe('42-screen');
  });
});

// ---------------------------------------------------------------------------
// buildTileData
// ---------------------------------------------------------------------------

describe('buildTileData', () => {
  it('returns empty array for no participants', () => {
    expect(buildTileData([], 1)).toEqual([]);
  });

  it('returns one camera tile per participant', () => {
    const tiles = buildTileData(
      [makeParticipant(10), makeParticipant(20)],
      10,
    );

    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toMatchObject({
      key: '10',
      isLocal: true,
      isScreen: false,
    });
    expect(tiles[1]).toMatchObject({
      key: '20',
      isLocal: false,
      isScreen: false,
    });
  });

  it('adds screen tile when participant is screen sharing', () => {
    const tiles = buildTileData(
      [makeParticipant(10, { screen: true })],
      99,
    );

    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toMatchObject({ key: '10', isScreen: false });
    expect(tiles[1]).toMatchObject({ key: '10-screen', isScreen: true });
  });

  it('does not add screen tile when participant is not sharing', () => {
    const tiles = buildTileData(
      [makeParticipant(10, { screen: false })],
      99,
    );

    expect(tiles).toHaveLength(1);
    expect(tiles[0].isScreen).toBe(false);
  });

  it('handles mixed participants (some sharing, some not)', () => {
    const tiles = buildTileData(
      [
        makeParticipant(10, { screen: true }),
        makeParticipant(20),
        makeParticipant(30, { screen: true }),
      ],
      10,
    );

    expect(tiles).toHaveLength(5);
    const keys = tiles.map((t) => t.key);
    expect(keys).toEqual(['10', '10-screen', '20', '30', '30-screen']);
  });

  it('correctly identifies local user across all tiles', () => {
    const tiles = buildTileData(
      [makeParticipant(10, { screen: true }), makeParticipant(20)],
      10,
    );

    const localTiles = tiles.filter((t) => t.isLocal);
    const remoteTiles = tiles.filter((t) => !t.isLocal);

    expect(localTiles).toHaveLength(2); // camera + screen
    expect(remoteTiles).toHaveLength(1); // user 20 camera only
  });

  it('preserves participant data reference', () => {
    const p = makeParticipant(10);
    const tiles = buildTileData([p], 10);

    expect(tiles[0].participant).toBe(p);
  });
});

// ---------------------------------------------------------------------------
// buildTileData with raisedHands
// ---------------------------------------------------------------------------

describe('buildTileData with raisedHands', () => {
  const participants: CallParticipant[] = [
    makeParticipant(1),
    makeParticipant(2),
    makeParticipant(3, { screen: true }),
  ];

  it('with no raisedHands param, preserves original order', () => {
    const tiles = buildTileData(participants, 99);
    const keys = tiles.map((t) => t.key);
    expect(keys).toEqual(['1', '2', '3', '3-screen']);
  });

  it('with empty Set, preserves original order', () => {
    const tiles = buildTileData(participants, 99, new Set());
    const keys = tiles.map((t) => t.key);
    expect(keys).toEqual(['1', '2', '3', '3-screen']);
  });

  it('raised-hand user sorted to top', () => {
    const tiles = buildTileData(participants, 99, new Set([2]));
    const keys = tiles.map((t) => t.key);
    expect(keys[0]).toBe('2');
  });

  it('multiple raised-hand users sorted to top, relative order preserved', () => {
    const tiles = buildTileData(participants, 99, new Set([2, 3]));
    const keys = tiles.map((t) => t.key);
    // User 2 and 3 raised — they come first in their original relative order
    expect(keys).toEqual(['2', '3', '3-screen', '1']);
  });

  it('screen share tiles stay with their parent participant after sorting', () => {
    const tiles = buildTileData(participants, 99, new Set([3]));
    const keys = tiles.map((t) => t.key);
    // User 3 (raised) comes first with their screen tile
    expect(keys).toEqual(['3', '3-screen', '1', '2']);
  });

  it('all raised: order unchanged', () => {
    const tiles = buildTileData(participants, 99, new Set([1, 2, 3]));
    const keys = tiles.map((t) => t.key);
    expect(keys).toEqual(['1', '2', '3', '3-screen']);
  });
});
