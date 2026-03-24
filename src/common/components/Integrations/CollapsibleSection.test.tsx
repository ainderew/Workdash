import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CollapsibleSection from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders title when open", () => {
    render(
      <CollapsibleSection title="Status" isOpen={true} onToggle={vi.fn()}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders children when open", () => {
    render(
      <CollapsibleSection title="Status" isOpen={true} onToggle={vi.fn()}>
        <p>Inner content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });

  it("hides children when closed via max-height 0", () => {
    render(
      <CollapsibleSection title="Status" isOpen={false} onToggle={vi.fn()}>
        <p>Inner content</p>
      </CollapsibleSection>,
    );

    const wrapper = screen.getByText("Inner content").closest(
      ".overflow-hidden",
    );
    expect(wrapper).toHaveClass("max-h-0");
  });

  it("calls onToggle when header button is clicked", () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleSection title="Status" isOpen={true} onToggle={onToggle}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows badge text when collapsed and badge is provided", () => {
    render(
      <CollapsibleSection
        title="Status"
        isOpen={false}
        onToggle={vi.fn()}
        badge="3 online"
      >
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("3 online")).toBeInTheDocument();
  });

  it("shows badge when open", () => {
    render(
      <CollapsibleSection
        title="Status"
        isOpen={true}
        onToggle={vi.fn()}
        badge="3 online"
      >
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("3 online")).toBeInTheDocument();
  });
});
