import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClutchFactorWidget } from "./ClutchFactorWidget";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { ClutchFactorData } from "../_types";

const mockData: ClutchFactorData = {
  players: [
    {
      displayName: "ClutchKing",
      dotaAccountId: 1,
      clutchFactor: 1.45,
      label: "Clutch Gene",
      closeGameWinRate: 70,
      normalWinRate: 55,
      closeGamesPlayed: 12,
    },
    {
      displayName: "ChokeArtist",
      dotaAccountId: 2,
      clutchFactor: 0.65,
      label: "Choke Artist",
      closeGameWinRate: 30,
      normalWinRate: 50,
      closeGamesPlayed: 8,
    },
  ],
};

describe("ClutchFactorWidget", () => {
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
      <ClutchFactorWidget workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.querySelector(".wd-widget-skeleton")).toBeInTheDocument();
  });

  it("shows empty message when no players", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_clutch_factor": { players: [] } },
    });
    render(<ClutchFactorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/not enough close games/i)).toBeInTheDocument();
  });

  it("renders player cards with labels", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_clutch_factor": mockData },
    });
    render(<ClutchFactorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("ClutchKing")).toBeInTheDocument();
    expect(screen.getByText("Clutch Gene")).toBeInTheDocument();
    expect(screen.getByText("ChokeArtist")).toBeInTheDocument();
    expect(screen.getByText("Choke Artist")).toBeInTheDocument();
  });

  it("shows win rate comparison bars", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_clutch_factor": mockData },
    });
    render(<ClutchFactorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
  });
});
