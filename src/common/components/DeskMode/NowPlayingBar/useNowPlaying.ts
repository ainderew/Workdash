import { useEffect, useState, useRef, useCallback } from "react";
import type React from "react";
import useMusicStore from "@/common/store/musicStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { MusicClientService } from "@/communication/music/musicService";
import { useWorkspacePermissions } from "@/common/hooks/useWorkspacePermissions";
import { useTrackElapsed } from "./useTrackElapsed";

const EMPTY_QUEUE: never[] = [];

interface LottieComponentType {
  (props: {
    animationData: object;
    loop: boolean;
    autoplay: boolean;
    style?: React.CSSProperties;
  }): React.ReactElement | null;
}

export function useNowPlaying() {
  const workspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
  const session = useMusicStore((s) =>
    workspaceId ? s.sessionsByWorkspace[workspaceId] : null,
  );
  const queue = useMusicStore((s) =>
    workspaceId
      ? (s.queuesByWorkspace[workspaceId] ?? EMPTY_QUEUE)
      : EMPTY_QUEUE,
  );
  const isListening = useMusicStore((s) =>
    workspaceId ? s.listeningWorkspaces.has(workspaceId) : false,
  );

  const lottieCache = useRef<{
    Component: LottieComponentType | null;
    animationData: object | null;
  }>({ Component: null, animationData: null });

  const [lottieReady, setLottieReady] = useState(
    !!(lottieCache.current.Component && lottieCache.current.animationData),
  );
  const [showQueue, setShowQueue] = useState(false);

  // ── Elapsed time tracker (client-side estimate) ──────────────────────
  const elapsed = useTrackElapsed(session, workspaceId);

  useEffect(() => {
    if (lottieReady) return;
    if (!session?.currentTrack) return;

    let cancelled = false;
    void Promise.all([
      import("lottie-react").then((m) => m.default),
      fetch("/assets/bot-avatars/musicbot.json").then((r) => r.json()),
    ]).then(([Lottie, data]) => {
      if (cancelled) return;
      lottieCache.current.Component = Lottie as unknown as LottieComponentType;
      lottieCache.current.animationData = data as object;
      setLottieReady(true);
    });
    return () => { cancelled = true; };
  }, [lottieReady, session?.currentTrack]);

  // Collapse queue when session ends
  useEffect(() => {
    if (!session) setShowQueue(false);
  }, [session]);

  // Collapse queue when workspace changes
  useEffect(() => {
    setShowQueue(false);
  }, [workspaceId]);

  const stateIcon = session?.state === "paused" ? "\u23F8" : "\u25B6";
  const stateLabel = session?.state === "paused" ? "Paused" : "Playing";

  const handleToggleListen = useCallback(() => {
    if (!workspaceId) return;
    const service = MusicClientService.getInstance();
    if (isListening) {
      service.unsubscribe(workspaceId);
    } else {
      service.subscribe(workspaceId);
    }
  }, [workspaceId, isListening]);

  const { canManageMusic } = useWorkspacePermissions(workspaceId);

  const handleTogglePlayback = useCallback(() => {
    if (!workspaceId) return;
    MusicClientService.getInstance().togglePlayback(workspaceId);
  }, [workspaceId]);

  const handleSkip = useCallback(() => {
    if (!workspaceId) return;
    MusicClientService.getInstance().skip(workspaceId);
  }, [workspaceId]);

  const handleToggleQueue = useCallback(() => {
    if (!workspaceId) return;
    const next = !showQueue;
    if (next && !useMusicStore.getState().queuesByWorkspace[workspaceId]) {
      MusicClientService.getInstance().fetchQueue(workspaceId);
    }
    setShowQueue(next);
  }, [workspaceId, showQueue]);

  return {
    workspaceId,
    session,
    queue,
    isListening,
    lottieReady,
    LottieComponent: lottieCache.current.Component,
    animationData: lottieCache.current.animationData,
    showQueue,
    stateIcon,
    stateLabel,
    elapsed,
    trackDuration: session?.currentTrack?.duration ?? 0,
    canManageMusic,
    handleToggleListen,
    handleTogglePlayback,
    handleSkip,
    handleToggleQueue,
  };
}
