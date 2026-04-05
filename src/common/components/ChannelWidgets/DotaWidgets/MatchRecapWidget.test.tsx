import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchRecapWidget } from "./MatchRecapWidget";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { MatchRecapData } from "../_types";

function makePlayer(overrides: Partial<MatchRecapData[number]["players"][number]> = {}) {
  return {
    displayName: "Player1",
    avatarUrl: null,
    dotaAccountId: 1,
    heroId: 1,
    heroName: "Anti-Mage",
    heroIcon: "",
    heroPortrait: "",
    kills: 10,
    deaths: 2,
    assists: 5,
    won: true,
    isMvp: false,
    highlights: [],
    ...overrides,
  };
}

function makeMatch(overrides: Partial<MatchRecapData[number]> = {}): MatchRecapData[number] {
  return {
    matchId: "123",
    startTime: new Date().toISOString(),
    durationSec: 2400,
    radiantWin: true,
    players: [makePlayer()],
    ...overrides,
  };
}

describe("MatchRecapWidget", () => {
  beforeEach(() => {
    useWidgetStore.setState({
      configsByChannel: {},
      trackedPlayersByChannel: {},
      widgetDataByKey: {},
      activeWidgetTab: {},
      syncStatus: {},
      isLoading: false,
    });
  });

  it("shows skeleton when data is not loaded", () => {
    const { container } = render(
      <MatchRecapWidget workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.querySelector(".wd-widget-skeleton")).toBeInTheDocument();
  });

  it("shows empty message when data is empty array", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_match_recap": [] },
    });
    render(<MatchRecapWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/no recent match/i)).toBeInTheDocument();
  });

  it('shows "Victory" when all tracked players won', () => {
    const match = makeMatch({
      players: [
        makePlayer({ displayName: "Alice", dotaAccountId: 1, won: true }),
        makePlayer({ displayName: "Bob", dotaAccountId: 2, won: true }),
      ],
    });
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_match_recap": [match] },
    });
    render(<MatchRecapWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Victory")).toBeInTheDocument();
    expect(screen.queryByText("Defeat")).not.toBeInTheDocument();
    expect(screen.queryByText("Mixed")).not.toBeInTheDocument();
  });

  it('shows "Defeat" when all tracked players lost', () => {
    const match = makeMatch({
      radiantWin: true,
      players: [
        makePlayer({ displayName: "Alice", dotaAccountId: 1, won: false }),
        makePlayer({ displayName: "Bob", dotaAccountId: 2, won: false }),
      ],
    });
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_match_recap": [match] },
    });
    render(<MatchRecapWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Defeat")).toBeInTheDocument();
    expect(screen.queryByText("Victory")).not.toBeInTheDocument();
    expect(screen.queryByText("Mixed")).not.toBeInTheDocument();
  });

  it('shows "Mixed" when tracked players are on both sides', () => {
    const match = makeMatch({
      players: [
        makePlayer({ displayName: "Alice", dotaAccountId: 1, won: true }),
        makePlayer({ displayName: "Bob", dotaAccountId: 2, won: false }),
      ],
    });
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_match_recap": [match] },
    });
    render(<MatchRecapWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Mixed")).toBeInTheDocument();
    expect(screen.queryByText("Victory")).not.toBeInTheDocument();
    expect(screen.queryByText("Defeat")).not.toBeInTheDocument();
  });

  it("does not show Radiant or Dire in the header", () => {
    const match = makeMatch({
      radiantWin: true,
      players: [makePlayer({ won: true })],
    });
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_match_recap": [match] },
    });
    render(<MatchRecapWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.queryByText(/radiant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dire/i)).not.toBeInTheDocument();
  });

  it("renders player KDA and hero name", () => {
    const match = makeMatch({
      players: [
        makePlayer({
          displayName: "Alice",
          heroName: "Anti-Mage",
          kills: 10,
          deaths: 2,
          assists: 5,
          won: true,
        }),
      ],
    });
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_match_recap": [match] },
    });
    render(<MatchRecapWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Anti-Mage")).toBeInTheDocument();
    expect(screen.getByText("10/2/5")).toBeInTheDocument();
  });
});
