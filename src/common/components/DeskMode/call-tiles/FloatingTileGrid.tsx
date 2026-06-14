import React from 'react';
import type { CallParticipant } from '@/common/store/callStore';
import useCallStore from '@/common/store/callStore';
import useCallReactionStore from '@/common/store/callReactionStore';
import CallParticipantTile from '../CallParticipantTile';
import ScreenShareTile from '../ScreenShareTile';
import CallAvatar from '../CallAvatar';
import { buildTileData, resolveFocusedKey, type TileData } from './buildTileData';

interface FloatingTileGridProps {
  participants: CallParticipant[];
  channelId: string;
  localUserId: number;
  fillHeight?: boolean;
}

const TILE_CONTAINER_HEIGHT = 168;

function renderTile(tile: TileData, channelId: string, pinnedTileKey: string | null, togglePin: (key: string) => void, fillHeight = false) {
  const content = tile.isScreen ? (
    <ScreenShareTile
      key={tile.key}
      participant={tile.participant}
      isLocal={tile.isLocal}
      isPinned={pinnedTileKey === tile.key}
      onTogglePin={() => togglePin(tile.key)}
      fillCell={fillHeight}
    />
  ) : (
    <CallParticipantTile
      key={tile.key}
      participant={tile.participant}
      channelId={channelId}
      isLocal={tile.isLocal}
      isPinned={pinnedTileKey === tile.key}
      onTogglePin={() => togglePin(tile.key)}
      fillCell={fillHeight}
    />
  );

  if (fillHeight) {
    return (
      <div key={tile.key} className="h-full w-full min-h-0 min-w-0 overflow-hidden">
        {content}
      </div>
    );
  }

  return content;
}

export default function FloatingTileGrid({
  participants,
  channelId,
  localUserId,
  fillHeight = false,
}: FloatingTileGridProps) {
  const pinnedTileKey = useCallStore((s) => s.pinnedTileKey);
  const setPinnedTileKey = useCallStore((s) => s.setPinnedTileKey);
  const presenter = useCallStore((s) => s.presenter);
  const stageOptOut = useCallStore((s) => s.stageOptOut);

  const togglePin = (key: string) =>
    setPinnedTileKey(pinnedTileKey === key ? null : key);

  const raisedHands = useCallReactionStore((s) => s.raisedHands);
  const allTiles = buildTileData(participants, localUserId, raisedHands);

  // Stage presenter wins over a local pin for the big slot.
  const { key: focusedKey } = resolveFocusedKey(presenter, stageOptOut, pinnedTileKey);
  const focusedTile = focusedKey
    ? allTiles.find((t) => t.key === focusedKey)
    : null;

  if (focusedTile) {
    const others = allTiles.filter((t) => t.key !== focusedTile.key);
    const visibleOthers = fillHeight ? others : others.slice(0, 3);
    const hiddenCount = fillHeight ? 0 : others.length - visibleOthers.length;
    return (
      <div
        className={`flex flex-col p-2 ${fillHeight ? 'flex-1 min-h-0 overflow-hidden gap-3 p-4' : 'gap-1.5'}`}
        style={{
          ...(fillHeight ? { minHeight: 0 } : { height: TILE_CONTAINER_HEIGHT }),
          backgroundColor: 'var(--wd-surface-panel-2)',
        }}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          {renderTile(focusedTile, channelId, focusedTile.key, togglePin, fillHeight)}
        </div>
        {others.length > 0 && (
          <div className={`flex gap-1 shrink-0 overflow-hidden ${fillHeight ? 'gap-3 h-20' : 'h-12'}`}>
            {visibleOthers.map((t) => renderTile(t, channelId, focusedTile.key, togglePin, fillHeight))}
            {hiddenCount > 0 && (
              <div className="flex items-center justify-center rounded-lg wd-bg-elevated px-1">
                <span className="text-[10px] wd-text-muted">
                  +{hiddenCount}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default grid layout
  const visibleTiles = fillHeight ? allTiles : allTiles.slice(0, 4);
  const overflowCount = allTiles.length - visibleTiles.length;

  // For fullscreen: compute grid dimensions to equally divide space
  const cols = fillHeight
    ? Math.max(1, Math.ceil(Math.sqrt(visibleTiles.length)))
    : visibleTiles.length <= 1
      ? 1
      : 2;
  const rows = fillHeight
    ? Math.max(1, Math.ceil(visibleTiles.length / cols))
    : undefined;

  return (
    <div
      className={`grid p-2 ${fillHeight ? 'flex-1 min-h-0 overflow-hidden gap-3 p-4' : 'gap-1.5'}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        ...(rows != null ? { gridTemplateRows: `repeat(${rows}, 1fr)` } : {}),
        ...(fillHeight ? { minHeight: 0 } : { height: TILE_CONTAINER_HEIGHT }),
        backgroundColor: 'var(--wd-surface-panel-2)',
      }}
    >
      {visibleTiles.map((t) => renderTile(t, channelId, pinnedTileKey, togglePin, fillHeight))}
      {overflowCount > 0 && (
        <div className="flex items-center justify-center rounded-lg wd-bg-elevated">
          <div className="flex -space-x-1.5">
            {participants.slice(0, 3).map((p) => (
              <CallAvatar
                key={p.userId}
                userId={p.userId}
                displayName={p.displayName}
                channelId={channelId}
              />
            ))}
          </div>
          <span className="text-[10px] wd-text-muted ml-1">
            +{overflowCount}
          </span>
        </div>
      )}
    </div>
  );
}
