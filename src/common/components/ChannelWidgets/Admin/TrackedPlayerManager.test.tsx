import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrackedPlayerManager } from "./TrackedPlayerManager";
import { useWidgetStore } from "@/common/store/widgetStore";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TrackedPlayerManager", () => {
  beforeEach(() => {
    useWidgetStore.setState({
      configsByChannel: {},
      trackedPlayersByChannel: {},
      steamLinkedMembers: {},
      widgetDataByKey: {},
      activeWidgetTab: {},
      syncStatus: {},
      isLoading: false,
    });
    mockFetch.mockReset();
  });

  it("renders empty state with search input", () => {
    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);

    expect(screen.getByText("Tracked Players")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search linked members...")).toBeInTheDocument();
  });

  it("renders tracked players list", () => {
    useWidgetStore.setState({
      trackedPlayersByChannel: {
        "ch-1": [
          {
            id: "p1",
            workspaceId: "ws-1",
            channelId: "ch-1",
            dotaAccountId: 123456,
            steamId64: "76561198123456",
            displayName: "TestPlayer",
            userId: null,
            addedBy: 1,
            lastMatchId: null,
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
    });

    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);

    expect(screen.getByText("TestPlayer")).toBeInTheDocument();
    expect(screen.getByText("ID: 123456")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  it("shows linked workspace members that can be added", () => {
    useWidgetStore.setState({
      steamLinkedMembers: {
        "ws-1": [
          {
            userId: 1,
            username: "coolplayer",
            nickname: null,
            steamId64: "76561198111111",
            dotaAccountId: 111111,
            personaName: "CoolDude",
            rankTier: 55,
            mmrEstimate: 4500,
          },
        ],
      },
    });

    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);

    expect(screen.getByText("coolplayer")).toBeInTheDocument();
    expect(screen.getByText(/CoolDude/)).toBeInTheDocument();
    expect(screen.getByText(/4500 MMR/)).toBeInTheDocument();
  });

  it("filters linked members already tracked", () => {
    useWidgetStore.setState({
      trackedPlayersByChannel: {
        "ch-1": [
          {
            id: "p1",
            workspaceId: "ws-1",
            channelId: "ch-1",
            dotaAccountId: 111111,
            steamId64: "76561198111111",
            displayName: "CoolDude",
            userId: 1,
            addedBy: 1,
            lastMatchId: null,
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      steamLinkedMembers: {
        "ws-1": [
          {
            userId: 1,
            username: "coolplayer",
            nickname: null,
            steamId64: "76561198111111",
            dotaAccountId: 111111,
            personaName: "CoolDude",
            rankTier: 55,
            mmrEstimate: 4500,
          },
        ],
      },
    });

    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);

    // The member should not appear in the add list since they're already tracked
    const addButtons = screen.queryAllByRole("button");
    const memberAddButton = addButtons.find((btn) =>
      btn.textContent?.includes("coolplayer"),
    );
    expect(memberAddButton).toBeUndefined();
  });

  it("filters members by search query", () => {
    useWidgetStore.setState({
      steamLinkedMembers: {
        "ws-1": [
          {
            userId: 1,
            username: "alpha",
            nickname: null,
            steamId64: "765611",
            dotaAccountId: 111,
            personaName: "AlphaPlayer",
            rankTier: null,
            mmrEstimate: null,
          },
          {
            userId: 2,
            username: "bravo",
            nickname: null,
            steamId64: "765612",
            dotaAccountId: 222,
            personaName: "BravoPlayer",
            rankTier: null,
            mmrEstimate: null,
          },
        ],
      },
    });

    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);

    fireEvent.change(screen.getByPlaceholderText("Search linked members..."), {
      target: { value: "bravo" },
    });

    expect(screen.getByText("bravo")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("shows sync button with correct text", () => {
    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Sync Now")).toBeInTheDocument();
  });

  it("shows syncing text during sync", () => {
    useWidgetStore.setState({
      syncStatus: { "ch-1": "syncing" },
    });

    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);
    expect(screen.getByText("Syncing...")).toBeInTheDocument();
  });

  it("shows manual entry form when toggled", () => {
    render(<TrackedPlayerManager workspaceId="ws-1" channelId="ch-1" />);

    fireEvent.click(screen.getByText("Add manually by ID..."));

    expect(screen.getByPlaceholderText("Display Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Steam ID64")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dota Account ID")).toBeInTheDocument();
  });
});
