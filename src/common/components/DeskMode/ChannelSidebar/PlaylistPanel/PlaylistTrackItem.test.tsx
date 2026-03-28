import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistTrackItem } from "./PlaylistTrackItem";
import type { PlaylistTrackEntry } from "@/common/store/playlistStore";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

function makeEntry(overrides: Partial<PlaylistTrackEntry> = {}): PlaylistTrackEntry {
  return {
    id: "pt-1",
    position: 1,
    addedBy: "user-1",
    addedAt: "2026-01-01",
    track: {
      id: "track-1",
      title: "Test Song",
      artist: "Test Artist",
      genre: "Pop",
      durationSeconds: 185,
      source: "youtube",
    },
    ...overrides,
  };
}

function renderItem(overrides: Partial<React.ComponentProps<typeof PlaylistTrackItem>> = {}) {
  const defaults = {
    entry: makeEntry(),
    sortableId: "pt-1",
    canRemove: false,
    onRemove: vi.fn(),
    onPlayTrack: vi.fn(),
    onTogglePlayback: vi.fn(),
    onAddToQueue: vi.fn(),
    index: 0,
  };
  return render(<PlaylistTrackItem {...defaults} {...overrides} />);
}

describe("PlaylistTrackItem", () => {
  it("renders title and duration", () => {
    renderItem({ entry: makeEntry({ position: 3 }) });

    expect(screen.getByText("Test Song")).toBeInTheDocument();
    // duration: 185s = 3:05
    expect(screen.getByText(/3:05/)).toBeInTheDocument();
  });

  it("renders artist when available", () => {
    renderItem();
    expect(screen.getByText(/Test Artist/)).toBeInTheDocument();
  });

  it("renders duration without artist when artist is null", () => {
    const entry = makeEntry();
    entry.track.artist = null;
    renderItem({ entry });

    expect(screen.getByText("3:05")).toBeInTheDocument();
    expect(screen.queryByText(/Test Artist/)).not.toBeInTheDocument();
  });

  it("shows remove button when canRemove is true", () => {
    renderItem({ canRemove: true });
    expect(screen.getByLabelText("Remove Test Song")).toBeInTheDocument();
  });

  it("hides remove button when canRemove is false", () => {
    renderItem({ canRemove: false });
    expect(screen.queryByLabelText("Remove Test Song")).not.toBeInTheDocument();
  });

  it("calls onRemove when remove clicked", () => {
    const onRemove = vi.fn();
    renderItem({ canRemove: true, onRemove });

    fireEvent.click(screen.getByLabelText("Remove Test Song"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders drag handle", () => {
    const { container } = renderItem();
    // GripVertical icon renders as svg with lucide class
    expect(container.querySelector(".lucide-grip-vertical")).toBeInTheDocument();
  });

  it("calls onPlayTrack with track ID when play button clicked", () => {
    const onPlayTrack = vi.fn();
    renderItem({ onPlayTrack });

    fireEvent.click(screen.getByLabelText("Play Test Song"));
    expect(onPlayTrack).toHaveBeenCalledWith("track-1");
  });

  it("calls onAddToQueue with track ID when add-to-queue button clicked", () => {
    const onAddToQueue = vi.fn();
    renderItem({ onAddToQueue });

    fireEvent.click(screen.getByLabelText("Add Test Song to queue"));
    expect(onAddToQueue).toHaveBeenCalledWith("track-1");
  });
});
