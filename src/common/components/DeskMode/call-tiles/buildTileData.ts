import type { CallParticipant } from '@/common/store/callStore';

export interface TileData {
  key: string;
  participant: CallParticipant;
  isLocal: boolean;
  isScreen: boolean;
}

export function tileKey(userId: number, screen?: boolean): string {
  return screen ? `${userId}-screen` : String(userId);
}

/**
 * Builds a flat list of tile data from call participants.
 * Each participant gets a camera tile, plus a screen tile if they are sharing.
 */
export function buildTileData(
  participants: CallParticipant[],
  localUserId: number,
): TileData[] {
  const tiles: TileData[] = [];

  for (const p of participants) {
    tiles.push({
      key: tileKey(p.userId),
      participant: p,
      isLocal: p.userId === localUserId,
      isScreen: false,
    });

    if (p.media.screen) {
      tiles.push({
        key: tileKey(p.userId, true),
        participant: p,
        isLocal: p.userId === localUserId,
        isScreen: true,
      });
    }
  }

  return tiles;
}
