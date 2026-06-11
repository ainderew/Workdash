import { useCallback, useEffect, useMemo, useState } from 'react';
import useWorkspaceStore from '@/common/store/workspaceStore';
import {
  areNudgesEnabled,
  getLoungeHours,
  isAutoJoinEnabled,
  setAutoJoinEnabled,
  setLoungeHours,
  setNudgesEnabled,
  type LoungeHours,
} from '@/common/utils/loungePrefs';

const DEFAULT_WS_KEY = 'workdash:defaultWorkspaceId';
const AUTO_JOIN_MUSIC_KEY = 'workdash:autoJoinMusic';

export function useGeneralSettings() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const fetchMyWorkspaces = useWorkspaceStore((s) => s.fetchMyWorkspaces);

  useEffect(() => {
    if (workspaces.length === 0) {
      void fetchMyWorkspaces();
    }
  }, [workspaces.length, fetchMyWorkspaces]);

  const [defaultWorkspaceId, setDefaultWorkspaceIdState] = useState<string>(
    () => localStorage.getItem(DEFAULT_WS_KEY) ?? '',
  );

  const [autoJoinMusic, setAutoJoinMusicState] = useState<boolean>(
    () => localStorage.getItem(AUTO_JOIN_MUSIC_KEY) === 'true',
  );

  const setDefaultWorkspaceId = useCallback((id: string) => {
    setDefaultWorkspaceIdState(id);
    if (id) {
      localStorage.setItem(DEFAULT_WS_KEY, id);
    } else {
      localStorage.removeItem(DEFAULT_WS_KEY);
    }
  }, []);

  const setAutoJoinMusic = useCallback((enabled: boolean) => {
    setAutoJoinMusicState(enabled);
    localStorage.setItem(AUTO_JOIN_MUSIC_KEY, String(enabled));
  }, []);

  const [loungeNudges, setLoungeNudgesState] = useState<boolean>(() =>
    areNudgesEnabled(),
  );
  const [loungeAutoJoin, setLoungeAutoJoinState] = useState<boolean>(() =>
    isAutoJoinEnabled(),
  );
  const [loungeHours, setLoungeHoursState] = useState<LoungeHours>(() =>
    getLoungeHours(),
  );

  const setLoungeNudges = useCallback((enabled: boolean) => {
    setLoungeNudgesState(enabled);
    setNudgesEnabled(enabled);
  }, []);

  const setLoungeAutoJoin = useCallback((enabled: boolean) => {
    setLoungeAutoJoinState(enabled);
    setAutoJoinEnabled(enabled);
  }, []);

  const updateLoungeHours = useCallback((hours: LoungeHours) => {
    setLoungeHoursState(hours);
    setLoungeHours(hours);
  }, []);

  return useMemo(
    () => ({
      workspaces,
      defaultWorkspaceId,
      setDefaultWorkspaceId,
      autoJoinMusic,
      setAutoJoinMusic,
      loungeNudges,
      setLoungeNudges,
      loungeAutoJoin,
      setLoungeAutoJoin,
      loungeHours,
      updateLoungeHours,
    }),
    [
      workspaces,
      defaultWorkspaceId,
      setDefaultWorkspaceId,
      autoJoinMusic,
      setAutoJoinMusic,
      loungeNudges,
      setLoungeNudges,
      loungeAutoJoin,
      setLoungeAutoJoin,
      loungeHours,
      updateLoungeHours,
    ],
  );
}
