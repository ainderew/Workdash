import { useCallback, useEffect } from 'react';
import usePlaylistStore from '@/common/store/playlistStore';
import type { PlaylistInfo } from '@/common/store/playlistStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import { MusicClientService } from '@/communication/music/musicService';
import {
  fetchPlaylists,
  fetchPlaylistTracks,
  createPlaylist as apiCreatePlaylist,
  deletePlaylist as apiDeletePlaylist,
  renamePlaylist as apiRenamePlaylist,
  addTrackToPlaylist as apiAddTrack,
  addTrackByIdToPlaylist as apiAddTrackById,
  removeTrackFromPlaylist as apiRemoveTrack,
  apiReorderTrack,
  uploadPlaylistCover as apiUploadCover,
  removePlaylistCover as apiRemoveCover,
} from '@/communication/music/playlistApi';


export function usePlaylist(workspaceId: string | null) {
  const {
    playlists,
    playlistsLoading,
    loadedWorkspaceId,
    activePlaylistId,
    activePlaylistTracks,
    activePlaylistLoading,
    downloadProgress,
    setPlaylists,
    setPlaylistsLoading,
    setActivePlaylist,
    setActivePlaylistTracks,
    setActivePlaylistLoading,
    clearForWorkspace,
  } = usePlaylistStore();

  const loadPlaylists = useCallback(async () => {
    if (!workspaceId) return;
    setPlaylistsLoading(true);
    try {
      const data = await fetchPlaylists(workspaceId);
      setPlaylists(data);
      usePlaylistStore.setState({ loadedWorkspaceId: workspaceId });
    } catch (err) {
      console.warn('[playlist] Failed to load playlists:', err instanceof Error ? err.message : String(err));
    } finally {
      setPlaylistsLoading(false);
    }
  }, [workspaceId, setPlaylists, setPlaylistsLoading]);

  const loadPlaylistTracks = useCallback(
    async (playlistId: string) => {
      setActivePlaylistLoading(true);
      try {
        const tracks = await fetchPlaylistTracks(playlistId);
        setActivePlaylistTracks(tracks);
      } catch (err) {
        console.warn('[playlist] Failed to load tracks:', err instanceof Error ? err.message : String(err));
      } finally {
        setActivePlaylistLoading(false);
      }
    },
    [setActivePlaylistTracks, setActivePlaylistLoading],
  );

  // Fetch playlists on mount / workspace change
  useEffect(() => {
    if (!workspaceId) return;
    if (loadedWorkspaceId !== null && loadedWorkspaceId !== workspaceId) {
      clearForWorkspace();
    }
    void loadPlaylists();
  }, [workspaceId, loadedWorkspaceId, loadPlaylists, clearForWorkspace]);

  // Wire up socket event callbacks
  useEffect(() => {
    const musicService = MusicClientService.getInstance();

    const unsubChanged = musicService.onPlaylistsChanged((wsId: string) => {
      if (wsId === workspaceId) {
        void loadPlaylists();
      }
    });

    const unsubUpdated = musicService.onPlaylistUpdated((playlistId: string, wsId: string) => {
      if (wsId === workspaceId) {
        const currentActive = usePlaylistStore.getState().activePlaylistId;
        if (currentActive === playlistId) {
          void loadPlaylistTracks(playlistId);
        }
        void loadPlaylists();
      }
    });

    return () => {
      unsubChanged();
      unsubUpdated();
    };
  }, [workspaceId, loadPlaylists, loadPlaylistTracks]);

  const selectPlaylist = useCallback(
    (id: string) => {
      setActivePlaylist(id);
      void loadPlaylistTracks(id);
    },
    [setActivePlaylist, loadPlaylistTracks],
  );

  const backToList = useCallback(() => {
    setActivePlaylist(null);
  }, [setActivePlaylist]);

  const createPlaylist = useCallback(
    async (name: string, type: 'PERSONAL' | 'WORKSPACE') => {
      if (!workspaceId) return;
      await apiCreatePlaylist({ name, type, workspaceId });
    },
    [workspaceId],
  );

  const deletePlaylistAction = useCallback(
    async (id: string) => {
      await apiDeletePlaylist(id);
      if (activePlaylistId === id) {
        setActivePlaylist(null);
      }
    },
    [activePlaylistId, setActivePlaylist],
  );

  const renamePlaylistAction = useCallback(
    async (id: string, name: string) => {
      await apiRenamePlaylist(id, name);
    },
    [],
  );

  const addTrack = useCallback(
    async (playlistId: string, input: string) => {
      if (!workspaceId) return;
      await apiAddTrack(playlistId, input, workspaceId);
    },
    [workspaceId],
  );

  const addTrackById = useCallback(
    async (playlistId: string, trackId: string) => {
      await apiAddTrackById(playlistId, trackId);
    },
    [],
  );

  const removeTrack = useCallback(
    async (playlistId: string, trackId: string) => {
      await apiRemoveTrack(playlistId, trackId);
    },
    [],
  );

  const reorderTrack = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const playlistId = usePlaylistStore.getState().activePlaylistId;
      if (!playlistId) return;

      const snapshot = usePlaylistStore.getState().activePlaylistTracks;
      const track = snapshot[fromIndex];
      if (!track) return;

      usePlaylistStore.getState().reorderTracks(fromIndex, toIndex);

      try {
        await apiReorderTrack(playlistId, track.track.id, toIndex);
      } catch {
        usePlaylistStore.getState().setActivePlaylistTracks(snapshot);
      }
    },
    [],
  );

  const playTrack = useCallback(
    (trackId: string) => {
      const playlistId = usePlaylistStore.getState().activePlaylistId;
      if (!playlistId || !workspaceId) return;
      const roomId = useChatV2Store.getState().currentRoomId ?? undefined;
      MusicClientService.getInstance().emitPlayTrack(workspaceId, trackId, playlistId, roomId);
    },
    [workspaceId],
  );

  const addToQueue = useCallback(
    (trackId: string) => {
      if (!workspaceId) return;
      MusicClientService.getInstance().emitAddToQueue(workspaceId, trackId);
    },
    [workspaceId],
  );

  const uploadCoverImage = useCallback(
    async (playlistId: string, file: File) => {
      await apiUploadCover(playlistId, file);
    },
    [],
  );

  const removeCoverImage = useCallback(
    async (playlistId: string) => {
      await apiRemoveCover(playlistId);
    },
    [],
  );

  const playAll = useCallback(
    (playlistName: string) => {
      if (!workspaceId) return;
      const roomId = useChatV2Store.getState().currentRoomId;
      if (!roomId) return;
      const chatService = ChatV2Service.getInstance();
      void chatService.createMessage(roomId, `/play ${playlistName}`);
    },
    [workspaceId],
  );

  const activePlaylist: PlaylistInfo | undefined = playlists.find(
    (p) => p.id === activePlaylistId,
  );

  return {
    playlists,
    playlistsLoading,
    activePlaylist,
    activePlaylistTracks,
    activePlaylistLoading,
    downloadProgress,
    selectPlaylist,
    backToList,
    createPlaylist,
    deletePlaylist: deletePlaylistAction,
    renamePlaylist: renamePlaylistAction,
    addTrack,
    addTrackById,
    removeTrack,
    reorderTrack,
    playTrack,
    addToQueue,
    playAll,
    uploadCoverImage,
    removeCoverImage,
    refetchPlaylists: loadPlaylists,
  };
}
