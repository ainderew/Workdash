import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CallEventMessage } from "./CallEventMessage";
import type { ChatV2Message } from "@/communication/chatV2/_types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCallLeftMessage(
  overrides?: Partial<ChatV2Message>,
): ChatV2Message {
  return {
    id: "ephemeral-call-left-test-1",
    roomId: "room-1",
    senderUserId: 42,
    clientMessageId: "ephemeral-call-left-test-1",
    content: "Alice left the call",
    messageType: "SYSTEM",
    metadata: {
      eventType: "call_participant_left",
      displayName: "Alice",
      ephemeral: true,
    },
    replyToMessageId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    attachments: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CallEventMessage", () => {
  it("renders display name from metadata", () => {
    render(<CallEventMessage message={makeCallLeftMessage()} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/left the\s*call/)).toBeInTheDocument();
  });

  it("renders PhoneOff icon", () => {
    const { container } = render(
      <CallEventMessage message={makeCallLeftMessage()} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it('renders fallback "Someone" when metadata.displayName is missing', () => {
    const message = makeCallLeftMessage({
      metadata: {
        eventType: "call_participant_left",
        ephemeral: true,
      },
    });

    render(<CallEventMessage message={message} />);

    expect(screen.getByText("Someone")).toBeInTheDocument();
    expect(screen.getByText(/left the\s*call/)).toBeInTheDocument();
  });

  it("does not render avatar or message action buttons", () => {
    const { container } = render(
      <CallEventMessage message={makeCallLeftMessage()} />,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
