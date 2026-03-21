import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { RollCard } from "./RollCard";
import type { BotCardRoll } from "@/communication/chatV2/_types";

function makeCard(overrides: Partial<BotCardRoll> = {}): BotCardRoll {
  return {
    type: "roll",
    value: 42,
    max: 100,
    rolledBy: "Alice",
    ...overrides,
  };
}

describe("RollCard", () => {
  it("renders the roller name", () => {
    render(<RollCard card={makeCard()} />);
    expect(screen.getByText(/Alice rolled/)).toBeTruthy();
  });

  it("renders the max range zero-padded", () => {
    render(<RollCard card={makeCard({ max: 50 })} />);
    expect(screen.getByText(/\/ 050/)).toBeTruthy();
  });

  it("renders three digit reels", () => {
    const { container } = render(<RollCard card={makeCard({ value: 7 })} />);
    const reels = container.querySelectorAll(".wd-roll-reel");
    expect(reels).toHaveLength(3);
  });

  it("applies animation classes after mount", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const { container } = render(<RollCard card={makeCard({ value: 7 })} />);
    await act(() => Promise.resolve());
    const strips = container.querySelectorAll(".wd-roll-strip");
    expect(strips.length).toBeGreaterThanOrEqual(3);
    vi.restoreAllMocks();
  });

  it("renders value 0 as 000", () => {
    render(<RollCard card={makeCard({ value: 0, max: 100 })} />);
    expect(screen.getByText(/\/ 100/)).toBeTruthy();
  });

  it("renders max value correctly", () => {
    render(<RollCard card={makeCard({ value: 999, max: 999 })} />);
    expect(screen.getByText(/\/ 999/)).toBeTruthy();
  });
});
