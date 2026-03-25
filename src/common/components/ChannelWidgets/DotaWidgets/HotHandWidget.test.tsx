import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HotHandWidget } from "./HotHandWidget";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { HotHandData } from "../_types";

const mockData: HotHandData = {
  players: [
    {
      displayName: "HotPlayer",
      dotaAccountId: 1,
      score: 0.8,
      label: "ON FIRE",
      recentResults: ["W", "W", "W", "W", "W"],
    },
    {
      displayName: "ColdPlayer",
      dotaAccountId: 2,
      score: -0.8,
      label: "ICE COLD",
      recentResults: ["L", "L", "L", "L", "L"],
    },
  ],
};

describe("HotHandWidget", () => {
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
      <HotHandWidget workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.querySelector(".wd-widget-skeleton")).toBeInTheDocument();
  });

  it("shows empty message when no players", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_hot_hand": { players: [] } },
    });
    render(<HotHandWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
  });

  it("renders player cards with labels", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_hot_hand": mockData },
    });
    render(<HotHandWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("HotPlayer")).toBeInTheDocument();
    expect(screen.getByText("ON FIRE")).toBeInTheDocument();
    expect(screen.getByText("ColdPlayer")).toBeInTheDocument();
    expect(screen.getByText("ICE COLD")).toBeInTheDocument();
  });

  it("renders W/L result pills", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_hot_hand": mockData },
    });
    render(<HotHandWidget workspaceId="ws-1" channelId="ch-1" />);
    const wPills = screen.getAllByText("W");
    const lPills = screen.getAllByText("L");
    expect(wPills.length).toBe(5);
    expect(lPills.length).toBe(5);
  });
});
