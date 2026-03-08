import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { ScreenShareService } from '@/communication/screenShare/screenShare';
import { AudioChat } from '@/communication/audioChat/audioChat';
import useUiStore from '@/common/store/uiStore';
import CallParticipantTile from './CallParticipantTile';

interface CallViewProps {
  channelId: string;
  onLeave: () => void;
}

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 140;

export default function CallView({ channelId, onLeave }: CallViewProps) {
  const call = useCallStore((s) => s.activeCallsByChannel[channelId]);
  const userId = window.__BACKEND_USER__?.id ?? 0;
  const isMuted = useUiStore((s) => s.isMuted);
  const isVideoOff = useUiStore((s) => s.isVideoOff);

  // Load room members so tiles can resolve profile images + character data
  const membersByRoomId = useChatV2Store((s) => s.membersByRoomId);
  const loadRoomMembers = useChatV2Store((s) => s.loadRoomMembers);

  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startH.current = height;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [height],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH.current + delta)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    if (!membersByRoomId[channelId]) {
      loadRoomMembers(channelId);
    }
  }, [channelId, membersByRoomId, loadRoomMembers]);

  if (!call) return null;

  const handleToggleMic = () => {
    const audio = AudioChat.getInstance();
    if (isMuted) {
      audio.unMuteMic();
    } else {
      audio.muteMic();
    }
    useUiStore.getState().toggleMic();
    CallSignalingService.getInstance().setMedia(channelId, {
      audio: isMuted,
    });
  };

  const handleToggleVideo = () => {
    const videoService = VideoChatService.getInstance();
    if (isVideoOff) {
      videoService.startVideoChat();
    } else {
      videoService.stopVideoChat();
    }
    useUiStore.getState().toggleVideoCam();
    CallSignalingService.getInstance().setMedia(channelId, {
      video: isVideoOff,
    });
  };

  const handleScreenShare = async () => {
    const service = ScreenShareService.getInstance();
    try {
      await service.startScreenShare();
      CallSignalingService.getInstance().setMedia(channelId, {
        screen: true,
      });
    } catch {
      // User cancelled or error
    }
  };

  return (
    <div className="flex flex-col border-b wd-border-subtle">
      {/* Participant tiles — resizable container, tiles maintain aspect ratio */}
      <div
        className="flex items-center justify-center gap-2 p-3 wd-bg-panel-2 overflow-hidden"
        style={{ height }}
      >
        {call.participants.map((p) => (
          <CallParticipantTile
            key={p.userId}
            participant={p}
            channelId={channelId}
            isLocal={p.userId === userId}
          />
        ))}
      </div>

      {/* Drag handle */}
      <div
        className="h-3 cursor-row-resize flex items-center justify-center group"
        style={{ backgroundColor: 'var(--wd-surface-panel)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="w-12 h-1 rounded-full transition-colors group-hover:opacity-100 opacity-60"
          style={{ backgroundColor: 'var(--wd-text-muted)' }}
        />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 wd-bg-panel">
        <button
          type="button"
          onClick={handleToggleMic}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-full border transition-colors ${
            isMuted
              ? 'border-[var(--wd-danger)] text-[var(--wd-danger)]'
              : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
          }`}
          style={
            isMuted
              ? { backgroundColor: 'color-mix(in srgb, var(--wd-danger) 12%, transparent)' }
              : undefined
          }
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        <button
          type="button"
          onClick={handleToggleVideo}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-full border transition-colors ${
            isVideoOff
              ? 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
              : 'border-[var(--wd-success)] text-[var(--wd-success)]'
          }`}
          style={
            !isVideoOff
              ? { backgroundColor: 'color-mix(in srgb, var(--wd-success) 12%, transparent)' }
              : undefined
          }
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <VideoOff size={15} /> : <Video size={15} />}
        </button>

        <button
          type="button"
          onClick={handleScreenShare}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border wd-border-subtle wd-text-secondary hover:wd-text-primary transition-colors"
          title="Share screen"
        >
          <Monitor size={15} />
        </button>

        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--wd-border-subtle)' }} />

        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full transition-colors"
          style={{
            backgroundColor: 'var(--wd-danger)',
            color: '#fff',
          }}
          title="Leave call"
        >
          <PhoneOff size={15} />
        </button>
      </div>
    </div>
  );
}
