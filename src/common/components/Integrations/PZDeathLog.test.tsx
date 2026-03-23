import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PZDeathLog from "./PZDeathLog";
import type { PZDeathEvent } from "@/common/store/pzStore";

vi.mock("@/common/utils/relativeTime", () => ({
  formatRelativeTime: (ts: string) => {
    // Return a deterministic relative time for testing
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000) return "0s";
    return "5m";
  },
}));

function makeDeathEvent(overrides: Partial<PZDeathEvent> = {}): PZDeathEvent {
  return {
    id: "d1",
    username: "Survivor",
    action: "was eaten by zombies",
    timestamp: new Date(Date.now() - 300_000).toISOString(),
    isPvp: false,
    workdashUser: null,
    ...overrides,
  };
}

describe("PZDeathLog", () => {
  it("renders death events with player names", () => {
    const deaths = [
      makeDeathEvent({ id: "d1", username: "Alice", action: "died" }),
      makeDeathEvent({
        id: "d2",
        username: "bob_raw",
        action: "was killed",
        workdashUser: { displayName: "Bob", avatarUrl: null },
      }),
    ];

    render(<PZDeathLog deaths={deaths} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("died")).toBeInTheDocument();
    expect(screen.getByText("was killed")).toBeInTheDocument();
  });

  it("shows empty state when no deaths", () => {
    render(<PZDeathLog deaths={[]} />);

    expect(screen.getByText(/No deaths yet/)).toBeInTheDocument();
  });

  it("displays relative timestamps", () => {
    const deaths = [
      makeDeathEvent({
        id: "d1",
        timestamp: new Date(Date.now() - 300_000).toISOString(),
      }),
    ];

    render(<PZDeathLog deaths={deaths} />);

    expect(screen.getByText("5m")).toBeInTheDocument();
  });
});
