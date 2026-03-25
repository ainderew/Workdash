import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimePatternsWidget } from "./TimePatternsWidget";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { TimePatternsData } from "../_types";

const mockData: TimePatternsData = {
  players: [
    {
      displayName: "MorningPerson",
      dotaAccountId: 1,
      bestTimeSlot: { slot: "Morning", winRate: 75, games: 12 },
      worstTimeSlot: { slot: "Late Night", winRate: 25, games: 8 },
      bestDay: { day: "Saturday", winRate: 80, games: 10 },
      worstDay: { day: "Monday", winRate: 30, games: 6 },
      timeSlots: [
        { slot: "Late Night", winRate: 25, games: 8 },
        { slot: "Morning", winRate: 75, games: 12 },
        { slot: "Afternoon", winRate: 50, games: 6 },
        { slot: "Evening", winRate: 55, games: 10 },
      ],
      days: [
        { day: "Sunday", winRate: 50, games: 5 },
        { day: "Monday", winRate: 30, games: 6 },
        { day: "Tuesday", winRate: 60, games: 5 },
        { day: "Wednesday", winRate: 55, games: 5 },
        { day: "Thursday", winRate: 45, games: 5 },
        { day: "Friday", winRate: 65, games: 5 },
        { day: "Saturday", winRate: 80, games: 10 },
      ],
    },
    {
      displayName: "NightOwl",
      dotaAccountId: 2,
      bestTimeSlot: { slot: "Late Night", winRate: 70, games: 15 },
      worstTimeSlot: { slot: "Morning", winRate: 20, games: 5 },
      bestDay: { day: "Friday", winRate: 65, games: 8 },
      worstDay: { day: "Wednesday", winRate: 35, games: 6 },
      timeSlots: [
        { slot: "Late Night", winRate: 70, games: 15 },
        { slot: "Morning", winRate: 20, games: 5 },
        { slot: "Afternoon", winRate: 45, games: 6 },
        { slot: "Evening", winRate: 50, games: 8 },
      ],
      days: [
        { day: "Sunday", winRate: 50, games: 5 },
        { day: "Monday", winRate: 45, games: 5 },
        { day: "Tuesday", winRate: 50, games: 5 },
        { day: "Wednesday", winRate: 35, games: 6 },
        { day: "Thursday", winRate: 55, games: 5 },
        { day: "Friday", winRate: 65, games: 8 },
        { day: "Saturday", winRate: 60, games: 5 },
      ],
    },
  ],
};

describe("TimePatternsWidget", () => {
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
      <TimePatternsWidget workspaceId="ws-1" channelId="ch-1" />,
    );
    expect(container.querySelector(".wd-widget-skeleton")).toBeInTheDocument();
  });

  it("shows empty message when no players", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_time_patterns": { players: [] } },
    });
    render(<TimePatternsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText(/need more games/i)).toBeInTheDocument();
  });

  it("renders time slot grid", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_time_patterns": mockData },
    });
    render(<TimePatternsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Evening")).toBeInTheDocument();
  });

  it("renders day of week grid", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_time_patterns": mockData },
    });
    render(<TimePatternsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
  });

  it("shows player tabs and switches between players", () => {
    useWidgetStore.setState({
      widgetDataByKey: { "ch-1:dota_time_patterns": mockData },
    });
    render(<TimePatternsWidget workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("MorningPerson")).toBeInTheDocument();
    expect(screen.getByText("NightOwl")).toBeInTheDocument();

    fireEvent.click(screen.getByText("NightOwl"));
    // After switching, the grid should still render
    expect(screen.getByText("Morning")).toBeInTheDocument();
  });
});
