import React from 'react';
import type { CallParticipant } from '@/common/store/callStore';
import useCallStore from '@/common/store/callStore';
import useCallReactionStore from '@/common/store/callReactionStore';
import CallParticipantTile from '../CallParticipantTile';
import ScreenShareTile from '../ScreenShareTile';
import { buildTileData, resolveFocusedKey, type TileData } from './buildTileData';
import StageBanner from './StageBanner';

interface CallTileGridProps {
  participants: CallParticipant[];
  channelId: string;
  localUserId: number;
  height: number;
  /** "transparent" lets a decorated parent (lounge hearth) paint the backdrop */
  surface?: 'panel' | 'transparent';
}

function renderTile(tile: TileData, channelId: string, pinnedTileKey: string | null, togglePin: (key: string) => void) {
  if (tile.isScreen) {
    return (
      <ScreenShareTile
        key={tile.key}
        participant={tile.participant}
        isLocal={tile.isLocal}
        isPinned={pinnedTileKey === tile.key}
        onTogglePin={() => togglePin(tile.key)}
      />
    );
  }
  return (
    <CallParticipantTile
      key={tile.key}
      participant={tile.participant}
      channelId={channelId}
      isLocal={tile.isLocal}
      isPinned={pinnedTileKey === tile.key}
      onTogglePin={() => togglePin(tile.key)}
    />
  );
}

export default function CallTileGrid({
  participants,
  channelId,
  localUserId,
  height,
  surface = 'panel',
}: CallTileGridProps) {
  const surfaceClass = surface === 'panel' ? 'wd-bg-panel-2' : '';
  const pinnedTileKey = useCallStore((s) => s.pinnedTileKey);
  const setPinnedTileKey = useCallStore((s) => s.setPinnedTileKey);
  const presenter = useCallStore((s) => s.presenter);
  const stageOptOut = useCallStore((s) => s.stageOptOut);
  const setStageOptOut = useCallStore((s) => s.setStageOptOut);

  const togglePin = (key: string) =>
    setPinnedTileKey(pinnedTileKey === key ? null : key);

  const raisedHands = useCallReactionStore((s) => s.raisedHands);
  const allTiles = buildTileData(participants, localUserId, raisedHands);

  // Stage presenter wins over a local pin; the focused key drives the big slot.
  const { key: focusedKey } = resolveFocusedKey(presenter, stageOptOut, pinnedTileKey);
  const focusedTile = focusedKey
    ? allTiles.find((t) => t.key === focusedKey)
    : null;
  const otherTiles = focusedTile
    ? allTiles.filter((t) => t.key !== focusedTile.key)
    : allTiles;

  const presenterName = presenter
    ? participants.find((p) => p.userId === presenter.userId)?.displayName ?? 'Someone'
    : null;

  const banner = presenter ? (
    <StageBanner
      presenterName={presenterName ?? 'Someone'}
      optedOut={stageOptOut}
      onToggleOptOut={() => setStageOptOut(!stageOptOut)}
    />
  ) : null;

  if (focusedTile) {
    return (
      <div className="flex flex-col">
        {banner}
        <div
          className={`flex gap-2 p-3 ${surfaceClass} overflow-hidden`}
          style={{ height }}
        >
          <div className="flex-1 min-w-0 h-full flex items-center justify-center">
            {renderTile(focusedTile, channelId, focusedTile.key, togglePin)}
          </div>
          {otherTiles.length > 0 && (
            <div className="flex flex-col gap-1.5 h-full overflow-y-auto" style={{ width: 100 }}>
              {otherTiles.map((t) => renderTile(t, channelId, focusedTile.key, togglePin))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {banner}
      <div
        className={`flex items-center justify-center gap-2 p-3 ${surfaceClass} overflow-hidden`}
        style={{ height }}
      >
        {allTiles.map((t) => renderTile(t, channelId, pinnedTileKey, togglePin))}
      </div>
    </div>
  );
}
