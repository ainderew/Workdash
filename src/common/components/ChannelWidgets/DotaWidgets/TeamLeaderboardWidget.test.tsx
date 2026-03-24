import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamLeaderboardWidget } from "./TeamLeaderboardWidget";
import { useWidgetStore } from "@/common/store/widgetStore";

const mockLeaderboardData = {
  roles: [
    {
      role: "Mid",
      rankings: [
        {
          displayName: "TopPlayer",
          dotaAccountId: 1,
          winRate: 72,
          gamesPlayed: 18,
          avgKda: 4.2,
        },
        {
          displayName: "SecondPlayer",
          dotaAccountId: 2,
          winRate: 58,
          gamesPlayed: 12,
          avgKda: 3.1,
        },
        {
          displayName: "ThirdPlayer",
          dotaAccountId: 3,
          winRate: 45,
          gamesPlayed: 10,
          avgKda: 2.0,
        },
      ],
    },
    {
      role: "Safe Lane",
      rankings: [
        {
          displayName: "CarryKing",
          dotaAccountId: 4,
          winRate: 65,
          gamesPlayed: 20,
          avgKda: 5.0,
        },
      ],
    },
  ],
};

describe("TeamLeaderboardWidget", () => {
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
      <TeamLeaderboardWidget workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.querySelector(".wd-widget-skeleton")).toBeInTheDocument();
  });

  it("shows empty message when no roles have data", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_team_leaderboard": { roles: [] } },
    });
    render(<TeamLeaderboardWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
  });

  it("renders role tabs", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_team_leaderboard": mockLeaderboardData,
      },
    });
    render(<TeamLeaderboardWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Mid")).toBeInTheDocument();
    expect(screen.getByText("Safe Lane")).toBeInTheDocument();
  });

  it("shows first role's rankings by default", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_team_leaderboard": mockLeaderboardData,
      },
    });
    render(<TeamLeaderboardWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("TopPlayer")).toBeInTheDocument();
    expect(screen.getByText("SecondPlayer")).toBeInTheDocument();
    expect(screen.getByText("ThirdPlayer")).toBeInTheDocument();
  });

  it("switches rankings when clicking a different role tab", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_team_leaderboard": mockLeaderboardData,
      },
    });
    render(<TeamLeaderboardWidget workspaceId="ws-1" channelId="ch-1" />);

    fireEvent.click(screen.getByText("Safe Lane"));
    expect(screen.getByText("CarryKing")).toBeInTheDocument();
    expect(screen.queryByText("TopPlayer")).not.toBeInTheDocument();
  });

  it("shows MVP badge for the #1 ranked player", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_team_leaderboard": mockLeaderboardData,
      },
    });
    render(<TeamLeaderboardWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("MVP")).toBeInTheDocument();
  });

  it("displays win rate, games, and KDA for each player", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_team_leaderboard": mockLeaderboardData,
      },
    });
    render(<TeamLeaderboardWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText(/18 games/)).toBeInTheDocument();
    expect(screen.getByText(/4.2 KDA/)).toBeInTheDocument();
  });
});
