import React from "react";
import { QueuePanel } from "../QueuePanel";
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
    handleToggleListen,
    handleTogglePlayback,
    handleSkip,
    handleToggleQueue,
  } = useNowPlaying();

  if (!session || !session.currentTrack) return null;

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
            <QueuePanel tracks={queue} />
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
        <PlaybackControls
          state={session.state}
          canControl={canManageMusic}
          hasNextTrack={session.queueLength > 0}
          onTogglePlayback={handleTogglePlayback}
          onSkip={handleSkip}
        />

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
