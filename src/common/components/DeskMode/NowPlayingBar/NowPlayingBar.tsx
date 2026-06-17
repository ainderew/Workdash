import React, { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Shuffle, Repeat, Repeat1, Music } from "lucide-react";
import { QueueItem } from "./QueueItem";
import { PlaybackControls } from "./PlaybackControls";
import { ProgressBar } from "./ProgressBar";
import { PlaybackStatus } from "./PlaybackStatus";
import { VolumeButton } from "./VolumeButton";
import { useNowPlaying } from "./useNowPlaying";

export function NowPlayingBar() {
  const {
    session,
    queue,
    isListening,
    lottieReady,
    LottieComponent,
    animationData,
    showQueue,
    elapsed,
    trackDuration,
    canManageMusic,
    shuffle,
    repeatMode,
    handleToggleListen,
    handleTogglePlayback,
    handleSkip,
    handleToggleQueue,
    toggleShuffle,
    cycleRepeat,
    reorderQueue,
  } = useNowPlaying();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleQueueDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = queue.findIndex((_, i) => `queue-${i}` === String(active.id));
      const newIndex = queue.findIndex((_, i) => `queue-${i}` === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      reorderQueue(oldIndex, newIndex);
    },
    [queue, reorderQueue],
  );

  if (!session || !session.currentTrack) return null;

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const repeatTooltip = repeatMode === 'off' ? 'Repeat' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One';

  return (
    <div className="wd-bg-panel wd-neo-shadow-top flex flex-col items-center gap-0 select-none">
      {/* Collapsible Queue Panel */}
      <div
        className={`w-full overflow-hidden transition-[max-height] duration-300 ease-in-out ${showQueue ? "max-h-[240px]" : "max-h-0"}`}
        style={{ maxHeight: showQueue ? "240px" : "0px" }}
      >
        <div className="border-b wd-border-subtle pt-2 pb-1">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="wd-text-muted text-[10px] uppercase tracking-widest font-semibold">
              Up Next
            </span>
            <span className="wd-text-muted text-[10px]">
              {session.queueLength} tracks
            </span>
          </div>
          <div
            className="overflow-y-auto no-scrollbar"
            style={{ maxHeight: "196px" }}
          >
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                <span className="wd-text-muted text-[10px]">
                  No songs in queue
                </span>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleQueueDragEnd}
              >
                <SortableContext
                  items={queue.map((_, i) => `queue-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <ol className="flex flex-col w-full">
                    {queue.map((track, i) => (
                      <QueueItem
                        key={`queue-${i}`}
                        track={track}
                        index={i}
                        sortableId={`queue-${i}`}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Main NowPlayingBar body — compact single-row player */}
      <div className="flex w-full flex-col gap-1.5 px-2.5 py-2">
        {/* Row: small dancing astronaut + title + transport + mute */}
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--wd-accent)_14%,var(--wd-surface-panel-2))]">
            {lottieReady && LottieComponent && animationData ? (
              <LottieComponent
                animationData={animationData}
                loop
                autoplay
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Music size={16} className="wd-text-muted" />
            )}
          </div>

          <p className="min-w-0 flex-1 truncate text-[12px] font-semibold wd-text-primary">
            {session.currentTrack.title}
          </p>

          <PlaybackControls
            state={session.state}
            canControl={canManageMusic}
            hasNextTrack={session.queueLength > 0}
            onTogglePlayback={handleTogglePlayback}
            onSkip={handleSkip}
          />
          <VolumeButton />
        </div>

        {/* Thin progress */}
        <ProgressBar elapsed={elapsed} duration={trackDuration} />

        {/* Under-row: shuffle / repeat + status (state · listeners · queue · playlists) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleShuffle}
            disabled={!canManageMusic}
            className={`p-1 rounded-full transition-colors duration-150 ${
              !canManageMusic
                ? "opacity-40 cursor-not-allowed"
                : shuffle
                  ? "text-[var(--wd-accent)]"
                  : "wd-text-muted hover:wd-text-secondary"
            }`}
            title="Shuffle"
          >
            <Shuffle size={13} />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            disabled={!canManageMusic}
            className={`p-1 rounded-full transition-colors duration-150 ${
              !canManageMusic
                ? "opacity-40 cursor-not-allowed"
                : repeatMode !== "off"
                  ? "text-[var(--wd-accent)]"
                  : "wd-text-muted hover:wd-text-secondary"
            }`}
            title={repeatTooltip}
          >
            <RepeatIcon size={13} />
          </button>

          <div className="min-w-0 flex-1 overflow-hidden">
            <PlaybackStatus
              listenerCount={session.listenerCount}
              queueLength={session.queueLength}
              showQueue={showQueue}
              onToggleQueue={handleToggleQueue}
              isListening={isListening}
              onToggleListen={handleToggleListen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
