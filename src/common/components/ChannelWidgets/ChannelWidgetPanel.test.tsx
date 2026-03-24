import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChannelWidgetPanel } from "./ChannelWidgetPanel";
import { useWidgetStore } from "@/common/store/widgetStore";

// Mock nivo components
vi.mock("@nivo/bar", () => ({
  ResponsiveBar: () => <div data-testid="nivo-bar">Bar Chart</div>,
}));
vi.mock("@nivo/line", () => ({
  ResponsiveLine: () => <div data-testid="nivo-line">Line Chart</div>,
}));
vi.mock("@nivo/pie", () => ({
  ResponsivePie: () => <div data-testid="nivo-pie">Pie Chart</div>,
}));

function makeConfig(
  id: string,
  widgetType: string,
  isEnabled: boolean,
  position: number,
) {
  return {
    id,
    channelId: "room-1",
    widgetType,
    pluginType: "dota2",
    isEnabled,
    config: {},
    position,
    createdAt: "",
    updatedAt: "",
  };
}

describe("ChannelWidgetPanel", () => {
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

  it("renders nothing when no widgets are configured", () => {
    useWidgetStore.setState({
      configsByChannel: { "room-1": [] },
    });

    const { container } = render(
      <ChannelWidgetPanel roomId="room-1" workspaceId="ws-1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when all widgets are disabled", () => {
    useWidgetStore.setState({
      configsByChannel: {
        "room-1": [makeConfig("w1", "dota_tilt_detector", false, 0)],
      },
    });

    const { container } = render(
      <ChannelWidgetPanel roomId="room-1" workspaceId="ws-1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders header with enabled widget count", () => {
    useWidgetStore.setState({
      configsByChannel: {
        "room-1": [
          makeConfig("w1", "dota_tilt_detector", true, 0),
          makeConfig("w2", "dota_ward_stats", true, 1),
        ],
      },
    });

    render(<ChannelWidgetPanel roomId="room-1" workspaceId="ws-1" />);

    expect(screen.getByText("Dota 2")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders category tabs when widgets span multiple categories", () => {
    useWidgetStore.setState({
      configsByChannel: {
        "room-1": [
          makeConfig("w1", "dota_tilt_detector", true, 0),
          makeConfig("w2", "dota_ward_stats", true, 1),
        ],
      },
    });

    render(<ChannelWidgetPanel roomId="room-1" workspaceId="ws-1" />);

    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });

  it("defaults to first available category and switches on tab click", () => {
    useWidgetStore.setState({
      configsByChannel: {
        "room-1": [
          makeConfig("w1", "dota_tilt_detector", true, 0),
          makeConfig("w2", "dota_ward_stats", true, 1),
        ],
      },
    });

    render(<ChannelWidgetPanel roomId="room-1" workspaceId="ws-1" />);

    // Alerts is first available category — its widget should be visible
    expect(screen.getByText("Tilt Detector")).toBeInTheDocument();
    expect(screen.queryByText("Ward Stats")).not.toBeInTheDocument();

    // Switch to Stats tab
    fireEvent.click(screen.getByText("Stats"));

    expect(screen.getByText("Ward Stats")).toBeInTheDocument();
    expect(screen.queryByText("Tilt Detector")).not.toBeInTheDocument();
  });

  it("collapses dashboard when header is clicked", () => {
    useWidgetStore.setState({
      configsByChannel: {
        "room-1": [makeConfig("w1", "dota_tilt_detector", true, 0)],
      },
      widgetDataByKey: { "room-1:dota_tilt_detector": [] },
    });

    render(<ChannelWidgetPanel roomId="room-1" workspaceId="ws-1" />);

    const header = screen.getByText("Dota 2").closest("button");
    expect(header).not.toBeNull();

    fireEvent.click(header!);

    expect(screen.queryByText("Tilt Detector")).not.toBeInTheDocument();
  });

  it("hides category tabs when all widgets are in one category", () => {
    useWidgetStore.setState({
      configsByChannel: {
        "room-1": [
          makeConfig("w1", "dota_tilt_detector", true, 0),
          makeConfig("w2", "dota_comfort_picks", true, 1),
        ],
      },
    });

    render(<ChannelWidgetPanel roomId="room-1" workspaceId="ws-1" />);

    // Both are in Alerts category — no tab bar needed
    expect(screen.queryByText("Alerts")).not.toBeInTheDocument();
    // Both widgets visible
    expect(screen.getByText("Tilt Detector")).toBeInTheDocument();
    expect(screen.getByText("Comfort Picks")).toBeInTheDocument();
  });
});
