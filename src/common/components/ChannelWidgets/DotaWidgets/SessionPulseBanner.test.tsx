import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionPulseBanner } from "./SessionPulseBanner";
import { useWidgetStore } from "@/common/store/widgetStore";

describe("SessionPulseBanner", () => {
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

  it("renders nothing when no data", () => {
    const { container } = render(
      <SessionPulseBanner workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders pulse message when data exists", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_session_pulse": {
          message: "Andrew is on a 5-game win streak!",
          playerName: "Andrew",
          dotaAccountId: 100,
          statType: "streak",
          value: 5,
        },
      },
    });
    render(<SessionPulseBanner workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/Andrew is on a 5-game win streak!/)).toBeInTheDocument();
  });

  it("renders with loss streak styling", () => {
    useWidgetStore.setState({
      widgetDataByKey: {
        "ch-1:dota_session_pulse": {
          message: "Bob has dropped 4 in a row today...",
          playerName: "Bob",
          dotaAccountId: 200,
          statType: "loss_streak",
          value: 4,
        },
      },
    });
    render(<SessionPulseBanner workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/Bob has dropped 4 in a row/)).toBeInTheDocument();
  });
});
