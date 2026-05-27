import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./WorkspaceCallBadge", () => ({
    default: ({ workspaceId }: { workspaceId: string }) => (
        <span>ws-call-badge:{workspaceId}</span>
    ),
}));

vi.mock("./DmCallBadge", () => ({
    default: () => <span>dm-call-badge</span>,
}));

vi.mock("./DesktopApp/DesktopAppButton", () => ({
    default: () => <div>desktop-app-button-stub</div>,
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import GuildRail from "./GuildRail";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function defaultProps() {
    return {
        workspaces: [
            { id: "W1", name: "Workspace One", unreadCount: 0 },
            { id: "W2", name: "Workspace Two", unreadCount: 0 },
        ],
        railView: "server" as const,
        selectedWorkspaceId: "W1",
        dmUnreadCount: 0,
        onSelectWorkspace: vi.fn(),
        onSelectDm: vi.fn(),
    };
}

describe("GuildRail — call indicator wiring", () => {
    it("renders a WorkspaceCallBadge slot for every workspace icon", () => {
        render(<GuildRail {...defaultProps()} />);

        expect(screen.getByText("ws-call-badge:W1")).toBeInTheDocument();
        expect(screen.getByText("ws-call-badge:W2")).toBeInTheDocument();
    });

    it("renders the DmCallBadge slot on the DM rail entry", () => {
        render(<GuildRail {...defaultProps()} />);
        expect(screen.getByText("dm-call-badge")).toBeInTheDocument();
    });

    it("clicking a workspace button still calls onSelectWorkspace with that id", () => {
        const props = defaultProps();
        render(<GuildRail {...props} />);

        fireEvent.click(
            screen.getByRole("button", { name: /Workspace One/i }),
        );
        expect(props.onSelectWorkspace).toHaveBeenCalledWith("W1");
    });

    it("clicking the DM rail entry calls onSelectDm", () => {
        const props = defaultProps();
        render(<GuildRail {...props} />);

        fireEvent.click(
            screen.getByRole("button", { name: /Direct Messages/i }),
        );
        expect(props.onSelectDm).toHaveBeenCalledTimes(1);
    });

    it("renders the unread bubble AND the call badge together when both apply", () => {
        const props = defaultProps();
        props.workspaces = [
            { id: "W1", name: "Workspace One", unreadCount: 5 },
        ];
        render(<GuildRail {...props} />);

        // Unread bubble (from RailButton's own logic)
        expect(screen.getByText("5")).toBeInTheDocument();
        // Call badge slot
        expect(screen.getByText("ws-call-badge:W1")).toBeInTheDocument();
    });
});
