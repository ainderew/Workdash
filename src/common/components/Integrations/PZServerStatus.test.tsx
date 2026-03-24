import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PZServerStatus from "./PZServerStatus";
import type { PZPlayer } from "@/common/store/pzStore";

function makePlayer(overrides: Partial<PZPlayer> = {}): PZPlayer {
  return {
    steamId: "steam-1",
    pzUsername: "Survivor",
    workdashUser: null,
    kills: 0,
    deaths: 0,
    survivalTime: 0,
    ...overrides,
  };
}

describe("PZServerStatus", () => {
  it('shows "Server Online" text when isOnline is true', () => {
    render(<PZServerStatus isOnline={true} players={[]} />);
    expect(screen.getByText("Server Online")).toBeInTheDocument();
  });

  it('shows "Server Offline" text when isOnline is false', () => {
    render(<PZServerStatus isOnline={false} players={[]} />);
    expect(screen.getByText("Server Offline")).toBeInTheDocument();
  });

  it("renders player names in the list", () => {
    const players = [
      makePlayer({ steamId: "s1", pzUsername: "Alice" }),
      makePlayer({
        steamId: "s2",
        pzUsername: "bob",
        workdashUser: {
          id: 2,
          displayName: "Bob",
          avatarUrl: null,
        },
      }),
    ];

    render(<PZServerStatus isOnline={true} players={players} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it('shows "No players online" when list is empty', () => {
    render(<PZServerStatus isOnline={true} players={[]} />);
    expect(screen.getByText("No survivors online")).toBeInTheDocument();
  });
});
