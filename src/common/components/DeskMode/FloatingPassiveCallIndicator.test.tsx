import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import useCallStore from "@/common/store/callStore";

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted runs before vi.mock factory hoisting
// ---------------------------------------------------------------------------

const { mockChatState, mockTransferCallToThisTab, mockRejoinCall } = vi.hoisted(() => {
  return {
    mockChatState: { currentRoomId: "ch-2", roomsById: {} as Record<string, { name: string } | undefined> },
    mockTransferCallToThisTab: vi.fn().mockResolvedValue({ success: true }),
    mockRejoinCall: vi.fn().mockResolvedValue({ success: true }),
  };
});

vi.mock("@/communication/callSignaling/callSignalingService", () => ({
  CallSignalingService: {
    getInstance: () => ({
      transferCallToThisTab: mockTransferCallToThisTab,
      rejoinCall: mockRejoinCall,
    }),
  },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

// Mock chatV2Store to avoid Phaser transitive dependency (EventBus → Phaser).
// We need a real Zustand store to work with React's useSyncExternalStore.
vi.mock("@/common/store/chatV2Store", async () => {
  const zustand = await vi.importActual<typeof import("zustand")>("zustand");
  return {
    default: zustand.create(() => ({
      ...mockChatState,
    })),
  };
});

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import FloatingPassiveCallIndicator from "./FloatingPassiveCallIndicator";
import useChatV2Store from "@/common/store/chatV2Store";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const CHANNEL_1 = "ch-1";
const CHANNEL_2 = "ch-2";

function setChatStore(state: Record<string, unknown>) {
  (useChatV2Store as unknown as { setState: (s: Record<string, unknown>) => void }).setState(state);
}

beforeEach(() => {
  vi.clearAllMocks();
  useCallStore.getState().reset();
  setChatStore({ currentRoomId: CHANNEL_2, roomsById: {} });
});

// ---------------------------------------------------------------------------
// Visibility logic
// ---------------------------------------------------------------------------

describe("FloatingPassiveCallIndicator — visibility gating", () => {
  it("renders nothing when callOwnershipStatus is null", () => {
    useCallStore.setState({
      callOwnershipStatus: null,
      ownershipChannelId: null,
    });

    const { container } = render(<FloatingPassiveCallIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when callOwnershipStatus is 'owner'", () => {
    useCallStore.setState({
      callOwnershipStatus: "owner",
      ownershipChannelId: CHANNEL_1,
    });

    const { container } = render(<FloatingPassiveCallIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when user IS viewing the call's channel (CallBanner handles it)", () => {
    useCallStore.setState({
      callOwnershipStatus: "passive",
      ownershipChannelId: CHANNEL_1,
    });
    setChatStore({ currentRoomId: CHANNEL_1, roomsById: {} });

    const { container } = render(<FloatingPassiveCallIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the passive indicator when user is passive and NOT viewing the call's channel", () => {
    useCallStore.setState({
      callOwnershipStatus: "passive",
      ownershipChannelId: CHANNEL_1,
    });
    setChatStore({
      currentRoomId: CHANNEL_2,
      roomsById: { [CHANNEL_1]: { name: "general" } },
    });

    render(<FloatingPassiveCallIndicator />);
    expect(screen.getByText("Call active in another tab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take over" })).toBeInTheDocument();
  });

  it("renders the rejoin-available indicator when ownership was lost", () => {
    useCallStore.setState({
      callOwnershipStatus: "rejoin-available",
      ownershipChannelId: CHANNEL_1,
    });
    setChatStore({
      currentRoomId: CHANNEL_2,
      roomsById: { [CHANNEL_1]: { name: "design" } },
    });

    render(<FloatingPassiveCallIndicator />);
    expect(screen.getByText("Call disconnected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejoin" })).toBeInTheDocument();
  });

  it("renders nothing when ownershipChannelId is null even with a non-null status", () => {
    useCallStore.setState({
      callOwnershipStatus: "passive",
      ownershipChannelId: null,
    });

    const { container } = render(<FloatingPassiveCallIndicator />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Action wiring
// ---------------------------------------------------------------------------

describe("FloatingPassiveCallIndicator — action wiring", () => {
  it("calls transferCallToThisTab on Take over click", async () => {
    useCallStore.setState({
      callOwnershipStatus: "passive",
      ownershipChannelId: CHANNEL_1,
    });
    setChatStore({
      currentRoomId: CHANNEL_2,
      roomsById: { [CHANNEL_1]: { name: "general" } },
    });

    render(<FloatingPassiveCallIndicator />);
    fireEvent.click(screen.getByRole("button", { name: "Take over" }));

    await waitFor(() => {
      expect(mockTransferCallToThisTab).toHaveBeenCalledWith(CHANNEL_1);
    });
  });

  it("calls rejoinCall on Rejoin click", async () => {
    useCallStore.setState({
      callOwnershipStatus: "rejoin-available",
      ownershipChannelId: CHANNEL_1,
    });
    setChatStore({
      currentRoomId: CHANNEL_2,
      roomsById: { [CHANNEL_1]: { name: "general" } },
    });

    render(<FloatingPassiveCallIndicator />);
    fireEvent.click(screen.getByRole("button", { name: "Rejoin" }));

    await waitFor(() => {
      expect(mockRejoinCall).toHaveBeenCalledWith(CHANNEL_1);
    });
  });

  it("shows room name from roomsById", () => {
    useCallStore.setState({
      callOwnershipStatus: "passive",
      ownershipChannelId: CHANNEL_1,
    });
    setChatStore({
      currentRoomId: CHANNEL_2,
      roomsById: { [CHANNEL_1]: { name: "engineering" } },
    });

    render(<FloatingPassiveCallIndicator />);
    expect(screen.getByText("#engineering")).toBeInTheDocument();
  });

  it("falls back to 'call' when room name is not found", () => {
    useCallStore.setState({
      callOwnershipStatus: "passive",
      ownershipChannelId: CHANNEL_1,
    });
    setChatStore({ currentRoomId: CHANNEL_2, roomsById: {} });

    render(<FloatingPassiveCallIndicator />);
    expect(screen.getByText("#call")).toBeInTheDocument();
  });
});
