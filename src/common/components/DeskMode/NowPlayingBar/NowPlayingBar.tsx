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
import { Shuffle, Repeat, Repeat1 } from "lucide-react";
import { QueueItem } from "./QueueItem";
import { TrackInfo } from "./TrackInfo";
import { PlaybackControls } from "./PlaybackControls";
import { ProgressBar } from "./ProgressBar";
import { PlaybackStatus } from "./PlaybackStatus";
import { VolumeButton } from "./VolumeButton";
import { ListenButton } from "./ListenButton";
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
    stateIcon,
    stateLabel,
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

      {/* Main NowPlayingBar body */}
      <div className="flex flex-col justify-center items-center gap-0.5 px-3 py-2 w-full">
        <TrackInfo
          title={session.currentTrack.title}
          lottieReady={lottieReady}
          LottieComponent={LottieComponent}
          animationData={animationData}
        />

        {/* Playback controls with shuffle/repeat */}
        <div className="flex items-center justify-center gap-3 py-1">
          <button
            type="button"
            onClick={toggleShuffle}
            disabled={!canManageMusic}
            className={`p-1 rounded-full transition-colors duration-150 ${
              !canManageMusic ? 'opacity-40 cursor-not-allowed' :
              shuffle ? 'text-[var(--wd-accent)]' : 'wd-text-muted hover:wd-text-secondary'
            }`}
            title="Shuffle"
          >
            <Shuffle size={14} />
          </button>

          <PlaybackControls
            state={session.state}
            canControl={canManageMusic}
            hasNextTrack={session.queueLength > 0}
            onTogglePlayback={handleTogglePlayback}
            onSkip={handleSkip}
          />

          <button
            type="button"
            onClick={cycleRepeat}
            disabled={!canManageMusic}
            className={`p-1 rounded-full transition-colors duration-150 ${
              !canManageMusic ? 'opacity-40 cursor-not-allowed' :
              repeatMode !== 'off' ? 'text-[var(--wd-accent)]' : 'wd-text-muted hover:wd-text-secondary'
            }`}
            title={repeatTooltip}
          >
            <RepeatIcon size={14} />
          </button>
        </div>

        {/* Progress bar + volume button row */}
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex-1 min-w-0">
            <ProgressBar elapsed={elapsed} duration={trackDuration} />
          </div>
          <VolumeButton />
        </div>

        <PlaybackStatus
          stateIcon={stateIcon}
          stateLabel={stateLabel}
          listenerCount={session.listenerCount}
          queueLength={session.queueLength}
          showQueue={showQueue}
          onToggleQueue={handleToggleQueue}
        />
        <ListenButton isListening={isListening} onToggle={handleToggleListen} />
      </div>
    </div>
  );
}
