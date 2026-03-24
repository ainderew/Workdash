import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PZLeaderboard from "./PZLeaderboard";
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

describe("PZLeaderboard", () => {
  it("renders tab buttons for Kills, Deaths, Survived", () => {
    render(
      <PZLeaderboard players={[]} activeTab="kills" onTabChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: /Kills/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Deaths/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Survived/ }),
    ).toBeInTheDocument();
  });

  it("displays player names sorted by active stat", () => {
    const players = [
      makePlayer({ steamId: "s1", pzUsername: "LowKills", kills: 2 }),
      makePlayer({ steamId: "s2", pzUsername: "HighKills", kills: 10 }),
      makePlayer({ steamId: "s3", pzUsername: "MidKills", kills: 5 }),
    ];

    render(
      <PZLeaderboard
        players={players}
        activeTab="kills"
        onTabChange={vi.fn()}
      />,
    );

    screen.getAllByText(/Kills$/);
    // The tab buttons exist; check the leaderboard rows for player names
    expect(screen.getByText("HighKills")).toBeInTheDocument();
    expect(screen.getByText("MidKills")).toBeInTheDocument();
    expect(screen.getByText("LowKills")).toBeInTheDocument();

    // Verify the sort order by checking DOM order
    const allText = document.body.textContent ?? "";
    const highIdx = allText.indexOf("HighKills");
    const midIdx = allText.indexOf("MidKills");
    const lowIdx = allText.indexOf("LowKills");
    expect(highIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(lowIdx);
  });

  it('shows "No stats yet" when no data', () => {
    render(
      <PZLeaderboard players={[]} activeTab="kills" onTabChange={vi.fn()} />,
    );

    expect(screen.getByText(/No stats yet/)).toBeInTheDocument();
  });

  it("calls onTabChange when tab is clicked", () => {
    const onTabChange = vi.fn();
    render(
      <PZLeaderboard
        players={[]}
        activeTab="kills"
        onTabChange={onTabChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deaths/ }));
    expect(onTabChange).toHaveBeenCalledWith("deaths");

    fireEvent.click(screen.getByRole("button", { name: /Survived/ }));
    expect(onTabChange).toHaveBeenCalledWith("survived");
  });
});
