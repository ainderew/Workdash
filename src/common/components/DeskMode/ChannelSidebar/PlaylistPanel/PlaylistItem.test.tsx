import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistItem } from "./PlaylistItem";
import type { PlaylistInfo } from "@/common/store/playlistStore";

function makePlaylist(overrides: Partial<PlaylistInfo> = {}): PlaylistInfo {
  return {
    id: "pl-1",
    name: "My Playlist",
    type: "PERSONAL",
    workspaceId: "ws-1",
    creatorId: "user-1",
    trackCount: 5,
    createdAt: "2026-01-01",
    ...overrides,
  };
}

describe("PlaylistItem", () => {
  it("renders playlist name and track count", () => {
    render(
      <PlaylistItem
        playlist={makePlaylist({ name: "Chill Vibes", trackCount: 12 })}
        isActive={false}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Chill Vibes")).toBeInTheDocument();
    expect(screen.getByText(/12 songs/)).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <PlaylistItem
        playlist={makePlaylist()}
        isActive={false}
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a button element", () => {
    render(
      <PlaylistItem
        playlist={makePlaylist()}
        isActive={false}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
