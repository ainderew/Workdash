import { create } from 'zustand';

export interface PlaylistInfo {
  id: string;
  name: string;
  type: 'PERSONAL' | 'WORKSPACE';
  workspaceId: string;
  creatorId: string;
  coverImageUrl: string | null;
  trackCount: number;
  createdAt: string;
}

export interface PlaylistTrackEntry {
  id: string;
  position: number;
  addedBy: string;
  addedAt: string;
  track: {
    id: string;
    title: string;
    artist: string | null;
    genre: string | null;
    durationSeconds: number;
    source: 'youtube' | 'soundcloud';
  };
}

export interface DownloadProgress {
  trackTitle: string;
  percent: number;
  phase: 'resolving' | 'downloading' | 'complete' | 'error';
  error?: string;
}

interface PlaylistState {
  sidebarOpen: boolean;

  loadedWorkspaceId: string | null;
  playlists: PlaylistInfo[];
  playlistsLoading: boolean;

  activePlaylistId: string | null;
  activePlaylistTracks: PlaylistTrackEntry[];
  activePlaylistLoading: boolean;

  downloadProgress: DownloadProgress | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPlaylists: (playlists: PlaylistInfo[]) => void;
  setPlaylistsLoading: (loading: boolean) => void;
  setActivePlaylist: (id: string | null) => void;
  setActivePlaylistTracks: (tracks: PlaylistTrackEntry[]) => void;
  setActivePlaylistLoading: (loading: boolean) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  setDownloadProgress: (progress: DownloadProgress | null) => void;
  clearForWorkspace: () => void;
}

const usePlaylistStore = create<PlaylistState>((set) => ({
  sidebarOpen: false,

  loadedWorkspaceId: null,
  playlists: [],
  playlistsLoading: false,

  activePlaylistId: null,
  activePlaylistTracks: [],
  activePlaylistLoading: false,

  downloadProgress: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setPlaylists: (playlists) => set({ playlists }),
  setPlaylistsLoading: (playlistsLoading) => set({ playlistsLoading }),
  setActivePlaylist: (activePlaylistId) =>
    set({ activePlaylistId, activePlaylistTracks: [] }),
  setActivePlaylistTracks: (activePlaylistTracks) =>
    set({ activePlaylistTracks }),
  setActivePlaylistLoading: (activePlaylistLoading) =>
    set({ activePlaylistLoading }),
  reorderTracks: (fromIndex, toIndex) => {
    set((state) => {
      const tracks = [...state.activePlaylistTracks];
      const [moved] = tracks.splice(fromIndex, 1);
      if (!moved) return state;
      tracks.splice(toIndex, 0, moved);
      const reindexed = tracks.map((t, i) => ({ ...t, position: i }));
      return { activePlaylistTracks: reindexed };
    });
  },
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  clearForWorkspace: () =>
    set({
      loadedWorkspaceId: null,
      playlists: [],
      playlistsLoading: false,
      activePlaylistId: null,
      activePlaylistTracks: [],
      activePlaylistLoading: false,
      downloadProgress: null,
    }),
}));

export default usePlaylistStore;
