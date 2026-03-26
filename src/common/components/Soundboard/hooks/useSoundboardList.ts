import { useEffect } from 'react';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';
import { MediaTransportService } from '@/communication/mediaTransportService/mediaTransportService';
import useSoundboardStore from '@/common/store/soundboardStore';
import type { SoundboardSound } from '../_types';

export function useSoundboardList(workspaceId: string | null) {
  useEffect(() => {
    if (!workspaceId) return;

    const abortController = new AbortController();
    const store = useSoundboardStore.getState();

    // Re-fetch when workspace changes
    if (store.fetchedWorkspaceId !== workspaceId) {
      store.setFetchedWorkspaceId(workspaceId);
      store.setLoading(true);

      const jwt = tokenStore.getJwt();
      if (jwt) {
        fetch(`${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/soundboard`, {
          headers: { Authorization: `Bearer ${jwt}` },
          signal: abortController.signal,
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((data: { workspace: SoundboardSound[]; personal: SoundboardSound[] }) => {
            useSoundboardStore.getState().setSounds(
              data.workspace ?? [],
              data.personal ?? [],
            );
          })
          .catch((err) => {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            console.error('[soundboard] Failed to fetch sounds', err);
            useSoundboardStore.getState().setFetchedWorkspaceId(null);
          })
          .finally(() => {
            useSoundboardStore.getState().setLoading(false);
          });
      }
    }

    // Wire up realtime listeners
    const transport = MediaTransportService.getInstance();
    const socket = transport.socket;

    const onCreated = (data: { sound: SoundboardSound }) => {
      if (data?.sound) useSoundboardStore.getState().addSound(data.sound);
    };
    const onDeleted = (data: { soundId: string }) => {
      if (data?.soundId) useSoundboardStore.getState().removeSound(data.soundId);
    };

    socket.on('soundboard:sound:created', onCreated);
    socket.on('soundboard:sound:deleted', onDeleted);

    return () => {
      abortController.abort();
      socket.off('soundboard:sound:created', onCreated);
      socket.off('soundboard:sound:deleted', onDeleted);
    };
  }, [workspaceId]);
}
