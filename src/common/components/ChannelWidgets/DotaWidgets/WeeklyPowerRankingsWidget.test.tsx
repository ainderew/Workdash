import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyPowerRankingsWidget } from "./WeeklyPowerRankingsWidget";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { WeeklyPowerRankingsData } from "../_types";

const mockRankingsData: WeeklyPowerRankingsData = {
  rankings: [
    {
      rank: 1,
      displayName: "TopPlayer",
      dotaAccountId: 1,
      impactScore: 82,
      winRate: 75,
      gamesPlayed: 12,
      rankDelta: 2,
      bestHero: {
        heroId: 10,
        heroName: "Invoker",
        heroIcon: "/invoker.png",
        games: 5,
        winRate: 80,
      },
      isMvp: true,
      isMostImproved: false,
    },
    {
      rank: 2,
      displayName: "MidPlayer",
      dotaAccountId: 2,
      impactScore: 65,
      winRate: 55,
      gamesPlayed: 8,
      rankDelta: -1,
      bestHero: {
        heroId: 20,
        heroName: "Pudge",
        heroIcon: "/pudge.png",
        games: 3,
        winRate: 67,
      },
      isMvp: false,
      isMostImproved: false,
    },
    {
      rank: 3,
      displayName: "BottomPlayer",
      dotaAccountId: 3,
      impactScore: 38,
      winRate: 30,
      gamesPlayed: 10,
      rankDelta: -1,
      bestHero: {
        heroId: 30,
        heroName: "Crystal Maiden",
        heroIcon: "/cm.png",
        games: 4,
        winRate: 25,
      },
      isMvp: false,
      isMostImproved: true,
    },
  ],
  weekStart: "2026-03-18",
  weekEnd: "2026-03-25",
};

describe("WeeklyPowerRankingsWidget", () => {
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
      <WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.querySelector(".wd-widget-skeleton")).toBeInTheDocument();
  });

  it("shows empty message when no rankings", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_weekly_power_rankings": { rankings: [], weekStart: "2026-03-18", weekEnd: "2026-03-25" },
      },
    });
    render(<WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/need more games/i)).toBeInTheDocument();
  });

  it("renders all ranked players", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_weekly_power_rankings": mockRankingsData },
    });
    render(<WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />);

    expect(screen.getByText("TopPlayer")).toBeInTheDocument();
    expect(screen.getByText("MidPlayer")).toBeInTheDocument();
    expect(screen.getByText("BottomPlayer")).toBeInTheDocument();
  });

  it("shows MVP badge for #1 player", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_weekly_power_rankings": mockRankingsData },
    });
    render(<WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("MVP")).toBeInTheDocument();
  });

  it("shows Rising badge for most improved player", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_weekly_power_rankings": mockRankingsData },
    });
    render(<WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Rising")).toBeInTheDocument();
  });

  it("displays rank change indicators", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_weekly_power_rankings": mockRankingsData },
    });
    const { container } = render(<WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />);
    // TopPlayer has +2 delta — look for green success-colored indicator
    const successIndicators = container.querySelectorAll(".text-\\[var\\(--wd-success\\)\\]");
    expect(successIndicators.length).toBeGreaterThan(0);
  });

  it("shows win rate for each player", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_weekly_power_rankings": mockRankingsData },
    });
    render(<WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("shows week date range", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_weekly_power_rankings": mockRankingsData },
    });
    render(<WeeklyPowerRankingsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/2026-03-18/)).toBeInTheDocument();
    expect(screen.getByText(/2026-03-25/)).toBeInTheDocument();
  });
});
