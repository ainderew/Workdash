import type { CallParticipant, CallPresenter } from '@/common/store/callStore';

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
 * Which tile occupies the big "focus" slot. A synced stage presenter wins over
 * a local pin; if this viewer opted out of the stage, fall back to their pin.
 */
export function resolveFocusedKey(
  presenter: CallPresenter | null,
  stageOptOut: boolean,
  pinnedTileKey: string | null,
): { key: string | null; isStage: boolean } {
  if (presenter && !stageOptOut) {
    return {
      key: tileKey(presenter.userId, presenter.source === 'screen'),
      isStage: true,
    };
  }
  return { key: pinnedTileKey, isStage: false };
}

/**
 * Builds a flat list of tile data from call participants.
 * Each participant gets a camera tile, plus a screen tile if they are sharing.
 * When raisedHands is provided, raised-hand participants are sorted first.
 */
export function buildTileData(
  participants: CallParticipant[],
  localUserId: number,
  raisedHands?: Set<number>,
): TileData[] {
  const tiles: TileData[] = [];

  // Sort: raised hands first, preserve relative order otherwise
  const sorted = raisedHands?.size
    ? [...participants].sort((a, b) => {
        const aRaised = raisedHands.has(a.userId) ? 0 : 1;
        const bRaised = raisedHands.has(b.userId) ? 0 : 1;
        return aRaised - bRaised;
      })
    : participants;

  for (const p of sorted) {
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
