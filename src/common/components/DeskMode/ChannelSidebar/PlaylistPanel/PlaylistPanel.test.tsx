import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistPanel } from "./PlaylistPanel";
import type { PlaylistInfo, PlaylistTrackEntry } from "@/common/store/playlistStore";

// --- Helpers ---

function makePlaylist(overrides: Partial<PlaylistInfo> = {}): PlaylistInfo {
  return {
    id: "pl-1",
    name: "My Playlist",
    type: "PERSONAL",
    workspaceId: "ws-1",
    creatorId: "user-1",
    trackCount: 2,
    createdAt: "2026-01-01",
    ...overrides,
  };
}

function makeTrackEntry(overrides: Partial<PlaylistTrackEntry> = {}): PlaylistTrackEntry {
  return {
    id: "pt-1",
    position: 1,
    addedBy: "user-1",
    addedAt: "2026-01-01",
    track: {
      id: "track-1",
      title: "Test Song",
      artist: "Artist",
      genre: "Pop",
      durationSeconds: 180,
      source: "youtube",
    },
    ...overrides,
  };
}

// --- Mock state ---

let hookReturnValue: ReturnType<typeof makeDefaultHookReturn>;

function makeDefaultHookReturn() {
  return {
    playlists: [] as PlaylistInfo[],
    playlistsLoading: false,
    activePlaylist: undefined as PlaylistInfo | undefined,
    activePlaylistTracks: [] as PlaylistTrackEntry[],
    activePlaylistLoading: false,
    downloadProgress: null as { trackTitle: string; percent: number; phase: string; error?: string } | null,
    selectPlaylist: vi.fn(),
    backToList: vi.fn(),
    createPlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    renamePlaylist: vi.fn(),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    playAll: vi.fn(),
    refetchPlaylists: vi.fn(),
  };
}

// --- Mocks ---

vi.mock("./usePlaylist", () => ({
  usePlaylist: () => hookReturnValue,
}));

vi.mock("@/common/store/useStore", () => ({
  default: () => ({ backendUser: { id: 1 } }),
}));

vi.mock("./PlaylistItem", () => ({
  PlaylistItem: ({
    playlist,
    onClick,
  }: {
    playlist: PlaylistInfo;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button data-testid={`playlist-${playlist.id}`} onClick={onClick}>
      {playlist.name} ({playlist.trackCount})
    </button>
  ),
}));

vi.mock("./PlaylistTrackItem", () => ({
  PlaylistTrackItem: ({
    entry,
    onRemove,
    canRemove,
  }: {
    entry: PlaylistTrackEntry;
    onRemove: () => void;
    canRemove: boolean;
  }) => (
    <div data-testid={`track-${entry.track.id}`}>
      {entry.track.title}
      {canRemove && <button onClick={onRemove}>Remove</button>}
    </div>
  ),
}));

vi.mock("./CreatePlaylistDialog", () => ({
  CreatePlaylistDialog: () => <div data-testid="create-dialog" />,
}));

vi.mock("./AddTrackInput", () => ({
  AddTrackInput: () => <div data-testid="add-track-input" />,
}));

vi.mock("./DownloadProgress", () => ({
  DownloadProgress: ({ progress }: { progress: { trackTitle: string } }) => (
    <div data-testid="download-progress">{progress.trackTitle}</div>
  ),
}));

// --- Tests ---

describe("PlaylistPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookReturnValue = makeDefaultHookReturn();
  });

  it("shows 'No workspace selected' when workspaceId is null", () => {
    render(<PlaylistPanel workspaceId={null} />);
    expect(screen.getByText("No workspace selected")).toBeInTheDocument();
  });

  describe("list view", () => {
    it("renders playlist list when no active playlist", () => {
      hookReturnValue.playlists = [
        makePlaylist({ id: "pl-1", name: "Chill" }),
        makePlaylist({ id: "pl-2", name: "Workout", type: "WORKSPACE" }),
      ];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByTestId("playlist-pl-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-pl-2")).toBeInTheDocument();
    });

    it("shows empty state when no playlists", () => {
      hookReturnValue.playlists = [];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByText(/Start your library/)).toBeInTheDocument();
    });

    it("shows create button", () => {
      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByLabelText("Create playlist")).toBeInTheDocument();
    });

    it("shows loading state", () => {
      hookReturnValue.playlistsLoading = true;

      const { container } = render(<PlaylistPanel workspaceId="ws-1" />);

      // Skeleton loaders render animated placeholder divs
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("separates personal and workspace playlists into sections", () => {
      hookReturnValue.playlists = [
        makePlaylist({ id: "pl-1", type: "PERSONAL", name: "Personal" }),
        makePlaylist({ id: "pl-2", type: "WORKSPACE", name: "Shared" }),
      ];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByText("Your Playlists")).toBeInTheDocument();
      expect(screen.getByText("Shared")).toBeInTheDocument();
    });

    it("calls selectPlaylist when a playlist is clicked", () => {
      hookReturnValue.playlists = [makePlaylist({ id: "pl-1" })];

      render(<PlaylistPanel workspaceId="ws-1" />);

      fireEvent.click(screen.getByTestId("playlist-pl-1"));
      expect(hookReturnValue.selectPlaylist).toHaveBeenCalledWith("pl-1");
    });

    it("shows retry button when no playlists", () => {
      hookReturnValue.playlists = [];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  describe("detail view", () => {
    beforeEach(() => {
      hookReturnValue.activePlaylist = makePlaylist({
        id: "pl-1",
        name: "Chill Vibes",
        creatorId: "1",
      });
    });

    it("renders track list when playlist selected", () => {
      hookReturnValue.activePlaylistTracks = [
        makeTrackEntry({ id: "pt-1", track: { id: "t1", title: "Song A", artist: null, genre: null, durationSeconds: 120, source: "youtube" } }),
        makeTrackEntry({ id: "pt-2", track: { id: "t2", title: "Song B", artist: null, genre: null, durationSeconds: 200, source: "youtube" } }),
      ];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByText("Chill Vibes")).toBeInTheDocument();
      expect(screen.getByTestId("track-t1")).toBeInTheDocument();
      expect(screen.getByTestId("track-t2")).toBeInTheDocument();
    });

    it("shows back button that calls backToList", () => {
      render(<PlaylistPanel workspaceId="ws-1" />);

      fireEvent.click(screen.getByLabelText("Back to playlists"));
      expect(hookReturnValue.backToList).toHaveBeenCalled();
    });

    it("shows Play All button when tracks exist", () => {
      hookReturnValue.activePlaylistTracks = [makeTrackEntry()];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByText("Play")).toBeInTheDocument();
    });

    it("hides Play All when no tracks", () => {
      hookReturnValue.activePlaylistTracks = [];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.queryByText("Play")).not.toBeInTheDocument();
    });

    it("calls playAll with playlist name on Play All click", () => {
      hookReturnValue.activePlaylistTracks = [makeTrackEntry()];

      render(<PlaylistPanel workspaceId="ws-1" />);

      fireEvent.click(screen.getByText("Play"));
      expect(hookReturnValue.playAll).toHaveBeenCalledWith("Chill Vibes");
    });

    it("shows AddTrackInput component", () => {
      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByTestId("add-track-input")).toBeInTheDocument();
    });

    it("shows empty track message when no tracks", () => {
      hookReturnValue.activePlaylistTracks = [];

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByText(/No songs yet/)).toBeInTheDocument();
    });
  });

  describe("download progress", () => {
    it("shows DownloadProgress when progress is active", () => {
      hookReturnValue.downloadProgress = {
        trackTitle: "Downloading Song",
        percent: 45,
        phase: "downloading",
      };

      render(<PlaylistPanel workspaceId="ws-1" />);

      expect(screen.getByTestId("download-progress")).toBeInTheDocument();
      expect(screen.getByText("Downloading Song")).toBeInTheDocument();
    });
  });
});
