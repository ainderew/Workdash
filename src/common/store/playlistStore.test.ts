import { describe, it, expect, beforeEach } from "vitest";
import usePlaylistStore from "./playlistStore";
import type { PlaylistInfo, PlaylistTrackEntry, DownloadProgress } from "./playlistStore";

function makePlaylist(overrides: Partial<PlaylistInfo> = {}): PlaylistInfo {
  return {
    id: "pl-1",
    name: "Test Playlist",
    type: "PERSONAL",
    workspaceId: "ws-1",
    creatorId: "user-1",
    trackCount: 3,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTrackEntry(overrides: Partial<PlaylistTrackEntry> = {}): PlaylistTrackEntry {
  return {
    id: "pt-1",
    position: 0,
    addedBy: "user-1",
    addedAt: "2026-01-01T00:00:00Z",
    track: {
      id: "track-1",
      title: "Test Song",
      artist: "Test Artist",
      genre: "Pop",
      durationSeconds: 180,
      source: "youtube",
    },
    ...overrides,
  };
}

describe("playlistStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    usePlaylistStore.getState().clearForWorkspace();
  });

  it("setPlaylists updates playlists array", () => {
    const playlists = [makePlaylist(), makePlaylist({ id: "pl-2", name: "Second" })];
    usePlaylistStore.getState().setPlaylists(playlists);

    expect(usePlaylistStore.getState().playlists).toHaveLength(2);
    expect(usePlaylistStore.getState().playlists[0].name).toBe("Test Playlist");
  });

  it("setActivePlaylist sets active playlist ID", () => {
    usePlaylistStore.getState().setActivePlaylist("pl-1");

    expect(usePlaylistStore.getState().activePlaylistId).toBe("pl-1");
  });

  it("setActivePlaylist clears active playlist tracks", () => {
    usePlaylistStore.getState().setActivePlaylistTracks([makeTrackEntry()]);
    usePlaylistStore.getState().setActivePlaylist("pl-2");

    expect(usePlaylistStore.getState().activePlaylistTracks).toEqual([]);
  });

  it("setActivePlaylistTracks updates tracks", () => {
    const tracks = [makeTrackEntry(), makeTrackEntry({ id: "pt-2", position: 1 })];
    usePlaylistStore.getState().setActivePlaylistTracks(tracks);

    expect(usePlaylistStore.getState().activePlaylistTracks).toHaveLength(2);
  });

  it("setDownloadProgress sets progress", () => {
    const progress: DownloadProgress = {
      trackTitle: "Downloading...",
      percent: 50,
      phase: "downloading",
    };
    usePlaylistStore.getState().setDownloadProgress(progress);

    expect(usePlaylistStore.getState().downloadProgress).toEqual(progress);
  });

  it("setDownloadProgress(null) clears progress", () => {
    usePlaylistStore.getState().setDownloadProgress({
      trackTitle: "Done",
      percent: 100,
      phase: "complete",
    });
    usePlaylistStore.getState().setDownloadProgress(null);

    expect(usePlaylistStore.getState().downloadProgress).toBeNull();
  });

  it("clearForWorkspace resets all state", () => {
    usePlaylistStore.getState().setPlaylists([makePlaylist()]);
    usePlaylistStore.getState().setActivePlaylist("pl-1");
    usePlaylistStore.getState().setActivePlaylistTracks([makeTrackEntry()]);
    usePlaylistStore.getState().setDownloadProgress({
      trackTitle: "Test",
      percent: 50,
      phase: "downloading",
    });

    usePlaylistStore.getState().clearForWorkspace();

    const state = usePlaylistStore.getState();
    expect(state.playlists).toEqual([]);
    expect(state.playlistsLoading).toBe(false);
    expect(state.activePlaylistId).toBeNull();
    expect(state.activePlaylistTracks).toEqual([]);
    expect(state.activePlaylistLoading).toBe(false);
    expect(state.downloadProgress).toBeNull();
  });

  it("toggleSidebar flips sidebarOpen", () => {
    expect(usePlaylistStore.getState().sidebarOpen).toBe(false);
    usePlaylistStore.getState().toggleSidebar();
    expect(usePlaylistStore.getState().sidebarOpen).toBe(true);
    usePlaylistStore.getState().toggleSidebar();
    expect(usePlaylistStore.getState().sidebarOpen).toBe(false);
  });

  it("setPlaylistsLoading updates loading flag", () => {
    usePlaylistStore.getState().setPlaylistsLoading(true);
    expect(usePlaylistStore.getState().playlistsLoading).toBe(true);

    usePlaylistStore.getState().setPlaylistsLoading(false);
    expect(usePlaylistStore.getState().playlistsLoading).toBe(false);
  });
});
