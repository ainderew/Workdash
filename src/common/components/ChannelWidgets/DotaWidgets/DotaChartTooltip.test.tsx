import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DotaChartTooltip } from "./DotaChartTooltip";

describe("DotaChartTooltip", () => {
  it("renders items with labels and values", () => {
    render(
      <DotaChartTooltip
        items={[
          { label: "Win Rate", value: "72%", color: "red" },
          { label: "Games", value: 18 },
        ]}
      />,
    );
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Games")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <DotaChartTooltip
        title="Player Stats"
        items={[{ label: "Score", value: 42 }]}
      />,
    );
    expect(screen.getByText("Player Stats")).toBeInTheDocument();
  });

  it("renders without title", () => {
    const { container } = render(
      <DotaChartTooltip items={[{ label: "Score", value: 42 }]} />,
    );
    expect(container.querySelector(".wd-chart-tooltip")).toBeInTheDocument();
  });

  it("renders color dot when color is provided", () => {
    const { container } = render(
      <DotaChartTooltip
        items={[{ label: "Test", value: 1, color: "blue" }]}
      />,
    );
    const dot = container.querySelector(".rounded-full");
    expect(dot).toBeInTheDocument();
  });

  it("does not render color dot when color is omitted", () => {
    const { container } = render(
      <DotaChartTooltip items={[{ label: "Test", value: 1 }]} />,
    );
    const dots = container.querySelectorAll(".w-2.h-2.rounded-full");
    expect(dots).toHaveLength(0);
  });
});
