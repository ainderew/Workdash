import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { CallPresence, CallOwnershipStatus } from "@/common/store/callStore";
import useCallStore from "@/common/store/callStore";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockJoinCall = vi.fn().mockResolvedValue(null);
const mockLeaveCall = vi.fn().mockResolvedValue(undefined);
const mockTransferCallToThisTab = vi.fn().mockResolvedValue({ success: true });
const mockRejoinCall = vi.fn().mockResolvedValue({ success: true });

vi.mock("@/communication/callSignaling/callSignalingService", () => ({
  CallSignalingService: {
    getInstance: () => ({
      joinCall: mockJoinCall,
      leaveCall: mockLeaveCall,
      transferCallToThisTab: mockTransferCallToThisTab,
      rejoinCall: mockRejoinCall,
    }),
  },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("./CallView", () => ({
  default: ({ channelId, onLeave }: { channelId: string; onLeave: () => void }) => (
    <div data-testid="call-view" data-channel={channelId}>
      <button onClick={onLeave}>Leave</button>
    </div>
  ),
}));

vi.mock("./CallAvatar", () => ({
  default: ({ userId }: { userId: number }) => (
    <span data-testid={`avatar-${userId}`} />
  ),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import CallBanner from "./CallBanner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCall(channelId: string, participantCount = 1): CallPresence {
  const participants = Array.from({ length: participantCount }, (_, i) => ({
    userId: i + 1,
    displayName: `User ${i + 1}`,
    media: { audio: false, video: false, screen: false },
  }));
  return {
    channelId,
    type: "audio" as const,
    startedAt: new Date().toISOString(),
    participants,
  };
}

function setupStore(overrides: {
  channelId?: string;
  call?: CallPresence;
  currentCall?: { channelId: string } | null;
  isCallOwner?: boolean;
  callOwnershipStatus?: CallOwnershipStatus | null;
  ownershipChannelId?: string | null;
  manualFloating?: boolean;
}) {
  const channelId = overrides.channelId ?? "ch-1";
  const call = overrides.call ?? makeCall(channelId);

  useCallStore.setState({
    activeCallsByChannel: { [channelId]: call },
    currentCall: overrides.currentCall ?? null,
    isCallOwner: overrides.isCallOwner ?? false,
    callOwnershipStatus: overrides.callOwnershipStatus ?? null,
    ownershipChannelId: overrides.ownershipChannelId ?? null,
    manualFloating: overrides.manualFloating ?? false,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  useCallStore.getState().reset();
});

describe("CallBanner", () => {
  it("should return null when no call exists for channel", () => {
    const { container } = render(<CallBanner channelId="ch-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("should render CallView when user is call owner", () => {
    setupStore({
      currentCall: { channelId: "ch-1" },
      isCallOwner: true,
      callOwnershipStatus: "owner",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    expect(screen.getByTestId("call-view")).toBeInTheDocument();
  });

  it("should render passive banner when callOwnershipStatus is passive", () => {
    setupStore({
      callOwnershipStatus: "passive",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    expect(screen.getByText("Call active in another tab")).toBeInTheDocument();
    expect(screen.getByText("Take over here")).toBeInTheDocument();
  });

  it("should render rejoin banner when callOwnershipStatus is rejoin-available", () => {
    setupStore({
      callOwnershipStatus: "rejoin-available",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    expect(screen.getByText("Call disconnected")).toBeInTheDocument();
    expect(screen.getByText("Rejoin call")).toBeInTheDocument();
  });

  it("should render join banner when user is not in call", () => {
    setupStore({});

    render(<CallBanner channelId="ch-1" />);
    expect(screen.getByText(/in progress/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
  });

  it("should show participant count in passive state", () => {
    setupStore({
      call: makeCall("ch-1", 3),
      callOwnershipStatus: "passive",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    expect(screen.getByText("3 participants")).toBeInTheDocument();
  });

  it("should call transferCallToThisTab when Take over clicked", async () => {
    setupStore({
      callOwnershipStatus: "passive",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    fireEvent.click(screen.getByText("Take over here"));

    await waitFor(() => {
      expect(mockTransferCallToThisTab).toHaveBeenCalledWith("ch-1");
    });
  });

  it("should call rejoinCall when Rejoin clicked", async () => {
    setupStore({
      callOwnershipStatus: "rejoin-available",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    fireEvent.click(screen.getByText("Rejoin call"));

    await waitFor(() => {
      expect(mockRejoinCall).toHaveBeenCalledWith("ch-1");
    });
  });

  it("should clear ownership on failed transfer", async () => {
    mockTransferCallToThisTab.mockResolvedValueOnce({ success: false });

    setupStore({
      callOwnershipStatus: "passive",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    fireEvent.click(screen.getByText("Take over here"));

    await waitFor(() => {
      const state = useCallStore.getState();
      expect(state.callOwnershipStatus).toBeNull();
      expect(state.isCallOwner).toBe(false);
    });
  });

  it("should clear ownership on failed rejoin", async () => {
    mockRejoinCall.mockResolvedValueOnce({ success: false });

    setupStore({
      callOwnershipStatus: "rejoin-available",
      ownershipChannelId: "ch-1",
    });

    render(<CallBanner channelId="ch-1" />);
    fireEvent.click(screen.getByText("Rejoin call"));

    await waitFor(() => {
      const state = useCallStore.getState();
      expect(state.callOwnershipStatus).toBeNull();
    });
  });

  it("should disable join button when user is in another call", () => {
    setupStore({
      currentCall: { channelId: "ch-other" },
    });

    render(<CallBanner channelId="ch-1" />);
    const joinBtn = screen.getByRole("button", { name: "Join" });
    expect(joinBtn).toBeDisabled();
  });
});
