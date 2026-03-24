import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TiltDetectorWidget } from "./TiltDetectorWidget";
import { useWidgetStore } from "@/common/store/widgetStore";

describe("TiltDetectorWidget", () => {
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
      <TiltDetectorWidget workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.querySelector(".wd-widget-skeleton")).toBeInTheDocument();
  });

  it("shows empty message when no tilted players", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_tilt_detector": [] },
    });

    render(<TiltDetectorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/everyone's vibing/i)).toBeInTheDocument();
  });

  it("renders banter message for warning (3-loss streak)", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_tilt_detector": [
          {
            dotaAccountId: 123,
            displayName: "TestPlayer",
            severity: "warning",
            lossStreak: 3,
            recentResults: ["L", "L", "L", "W", "W"],
          },
        ],
      },
    });

    render(<TiltDetectorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(
      screen.getByText((text) => text.includes("TestPlayer")),
    ).toBeInTheDocument();
  });

  it("renders banter message for danger (4-loss streak)", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_tilt_detector": [
          {
            dotaAccountId: 456,
            displayName: "TiltedPlayer",
            severity: "danger",
            lossStreak: 4,
            recentResults: ["L", "L", "L", "L"],
          },
        ],
      },
    });

    render(<TiltDetectorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(
      screen.getByText((text) => text.includes("TiltedPlayer")),
    ).toBeInTheDocument();
  });

  it("renders banter message for critical (5+ loss streak)", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_tilt_detector": [
          {
            dotaAccountId: 789,
            displayName: "SuperTilted",
            severity: "critical",
            lossStreak: 6,
            recentResults: ["L", "L", "L", "L", "L", "L"],
          },
        ],
      },
    });

    render(<TiltDetectorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(
      screen.getByText((text) => text.includes("SuperTilted")),
    ).toBeInTheDocument();
  });

  it("renders W/L indicators", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_tilt_detector": [
          {
            dotaAccountId: 123,
            displayName: "Player",
            severity: "warning",
            lossStreak: 3,
            recentResults: ["L", "L", "L", "W"],
          },
        ],
      },
    });

    render(<TiltDetectorWidget workspaceId="ws-1" channelId="ch-1" />);
    const wIndicators = screen.getAllByText("W");
    const lIndicators = screen.getAllByText("L");
    expect(wIndicators).toHaveLength(1);
    expect(lIndicators).toHaveLength(3);
  });

  it("renders multiple alerts with different players", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_tilt_detector": [
          {
            dotaAccountId: 1,
            displayName: "Player1",
            severity: "warning",
            lossStreak: 3,
            recentResults: ["L", "L", "L"],
          },
          {
            dotaAccountId: 2,
            displayName: "Player2",
            severity: "critical",
            lossStreak: 5,
            recentResults: ["L", "L", "L", "L", "L"],
          },
        ],
      },
    });

    render(<TiltDetectorWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(
      screen.getByText((text) => text.includes("Player1")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((text) => text.includes("Player2")),
    ).toBeInTheDocument();
  });
});
