import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PZActivityFeed from "./PZActivityFeed";
import type { PZActivityEvent } from "@/common/store/pzStore";

vi.mock("@/common/utils/relativeTime", () => ({
  formatRelativeTime: (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000) return "0s";
    return "5m";
  },
}));

function makeActivityEvent(
  overrides: Partial<PZActivityEvent> = {},
): PZActivityEvent {
  return {
    id: "a1",
    type: "player_connect",
    username: "Survivor",
    action: "joined the server",
    timestamp: new Date(Date.now() - 300_000).toISOString(),
    workdashUser: null,
    ...overrides,
  };
}

describe("PZActivityFeed", () => {
  it("renders events with player names", () => {
    const events = [
      makeActivityEvent({ id: "a1", username: "Alice", action: "connected" }),
      makeActivityEvent({
        id: "a2",
        username: "bob_raw",
        action: "crafted an axe",
        workdashUser: { displayName: "Bob", avatarUrl: null },
      }),
    ];

    render(<PZActivityFeed events={events} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(screen.getByText("crafted an axe")).toBeInTheDocument();
  });

  it("shows empty state when no events", () => {
    render(<PZActivityFeed events={[]} />);

    expect(screen.getByText("Waiting for events...")).toBeInTheDocument();
  });

  it("displays relative timestamps", () => {
    const events = [
      makeActivityEvent({
        id: "a1",
        timestamp: new Date(Date.now() - 300_000).toISOString(),
      }),
    ];

    render(<PZActivityFeed events={events} />);

    expect(screen.getByText("5m")).toBeInTheDocument();
  });
});
