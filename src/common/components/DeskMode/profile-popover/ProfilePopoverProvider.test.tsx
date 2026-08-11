import React from "react";
import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi,
} from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks (must be declared before importing modules under test)
// ---------------------------------------------------------------------------

vi.mock("@/game/EventBus", () => ({
    EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
// jsdom doesn't implement ResizeObserver; the popover uses it for viewport fit.
(globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;

const mockGetUserProfile = vi.fn();
const mockGetUserAchievementDisplay = vi.fn();
const mockGetDotaStats = vi.fn();
const mockGetDotaMatches = vi.fn();
const mockGetBetrayalStats = vi.fn();
const mockOpenDirectMessage = vi.fn();
const mockCreateMessage = vi.fn();
const mockUpdateOwnUserProfile = vi.fn();

vi.mock("@/communication/chatV2/chatV2Service", () => ({
    ChatV2Service: {
        getInstance: vi.fn(() => ({
            getUserProfile: mockGetUserProfile,
            getUserAchievementDisplay: mockGetUserAchievementDisplay,
            getDotaStats: mockGetDotaStats,
            getDotaMatches: mockGetDotaMatches,
            getBetrayalStats: mockGetBetrayalStats,
            openDirectMessage: mockOpenDirectMessage,
            createMessage: mockCreateMessage,
            updateOwnUserProfile: mockUpdateOwnUserProfile,
            setupRealtimeHandlers: vi.fn().mockReturnValue(vi.fn()),
        })),
    },
}));

import {
    ProfilePopoverProvider,
    useProfilePopoverController,
} from "./ProfilePopoverProvider";
import { usePresenceStore } from "@/common/store/presenceStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfile(userId: number, isSelf = false) {
    return {
        user: {
            id: userId,
            name: `User ${userId}`,
            nickname: null,
            image: null,
            bio: null,
        },
        isSelf,
        friendshipStatus: null,
        canSendDirectMessage: true,
    };
}

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
    const base = {
        x: 100,
        y: 100,
        width: 200,
        height: 32,
        top: 100,
        left: 100,
        right: 300,
        bottom: 132,
        toJSON: () => ({}),
    };
    return { ...base, ...overrides } as DOMRect;
}

function TestConsumer({
    onReady,
}: {
    onReady: (controller: ReturnType<typeof useProfilePopoverController>) => void;
}) {
    const controller = useProfilePopoverController();
    React.useEffect(() => {
        onReady(controller);
    }, [controller, onReady]);
    return <div data-testid="open-user-id">{controller.openUserId ?? "-"}</div>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    mockGetUserProfile.mockReset().mockResolvedValue(makeProfile(0));
    mockGetUserAchievementDisplay.mockReset().mockResolvedValue([]);
    mockGetDotaStats.mockReset().mockResolvedValue(null);
    mockGetDotaMatches.mockReset().mockResolvedValue([]);
    mockGetBetrayalStats.mockReset().mockResolvedValue(null);
    mockOpenDirectMessage.mockReset();
    mockCreateMessage.mockReset();
    mockUpdateOwnUserProfile.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("ProfilePopoverProvider", () => {
    it("throws if useProfilePopoverController is called outside the provider", () => {
        const errorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        expect(() => renderHook(() => useProfilePopoverController())).toThrow(
            /must be used inside <ProfilePopoverProvider>/,
        );

        errorSpy.mockRestore();
    });

    it("opens a popover from an anchor and exposes openUserId", async () => {
        mockGetUserProfile.mockResolvedValue(makeProfile(42));

        let controller: ReturnType<typeof useProfilePopoverController> | null =
            null;
        render(
            <ProfilePopoverProvider>
                <TestConsumer onReady={(c) => (controller = c)} />
            </ProfilePopoverProvider>,
        );

        expect(controller?.openUserId).toBeNull();

        await act(async () => {
            controller?.openFromAnchor({
                userId: 42,
                name: "Alice",
                avatar: { mode: "fallback" },
                anchorRect: makeRect(),
                preferredSide: "left",
            });
        });

        expect(controller?.openUserId).toBe(42);
        expect(screen.getByTestId("open-user-id")).toHaveTextContent("42");
        expect(
            document.querySelector('[data-user-profile-popover="true"]'),
        ).not.toBeNull();
    });

    it("replaces an existing popover when opening for a different user", async () => {
        mockGetUserProfile.mockImplementation(async (id: number) =>
            makeProfile(id),
        );

        let controller: ReturnType<typeof useProfilePopoverController> | null =
            null;
        render(
            <ProfilePopoverProvider>
                <TestConsumer onReady={(c) => (controller = c)} />
            </ProfilePopoverProvider>,
        );

        await act(async () => {
            controller?.openFromAnchor({
                userId: 42,
                name: "Alice",
                avatar: { mode: "fallback" },
                anchorRect: makeRect(),
                preferredSide: "left",
            });
        });
        await act(async () => {
            controller?.openFromAnchor({
                userId: 43,
                name: "Bob",
                avatar: { mode: "fallback" },
                anchorRect: makeRect(),
                preferredSide: "left",
            });
        });

        expect(controller?.openUserId).toBe(43);
        const popovers = document.querySelectorAll(
            '[data-user-profile-popover="true"]',
        );
        expect(popovers).toHaveLength(1);
    });

    it("close() unmounts the popover", async () => {
        mockGetUserProfile.mockResolvedValue(makeProfile(42));

        let controller: ReturnType<typeof useProfilePopoverController> | null =
            null;
        render(
            <ProfilePopoverProvider>
                <TestConsumer onReady={(c) => (controller = c)} />
            </ProfilePopoverProvider>,
        );

        await act(async () => {
            controller?.openFromAnchor({
                userId: 42,
                name: "Alice",
                avatar: { mode: "fallback" },
                anchorRect: makeRect(),
                preferredSide: "left",
            });
        });
        expect(
            document.querySelector('[data-user-profile-popover="true"]'),
        ).not.toBeNull();

        await act(async () => {
            controller?.close();
        });

        expect(controller?.openUserId).toBeNull();
        expect(
            document.querySelector('[data-user-profile-popover="true"]'),
        ).toBeNull();
    });

    it("openFromCoords still works for legacy callers (no anchorRect)", async () => {
        mockGetUserProfile.mockResolvedValue(makeProfile(99));

        let controller: ReturnType<typeof useProfilePopoverController> | null =
            null;
        render(
            <ProfilePopoverProvider>
                <TestConsumer onReady={(c) => (controller = c)} />
            </ProfilePopoverProvider>,
        );

        await act(async () => {
            controller?.openFromCoords({
                x: 200,
                y: 200,
                senderUserId: 99,
                senderName: "Carol",
                senderAvatar: { mode: "fallback" },
            });
        });

        expect(controller?.openUserId).toBe(99);
        expect(
            document.querySelector('[data-user-profile-popover="true"]'),
        ).not.toBeNull();
    });

    // Clicking an @mention opens the popover via openFromCoords — the same
    // path MessageList.handleMentionClick uses.
    it("shows a mentioned user's custom status in their popover", async () => {
        mockGetUserProfile.mockResolvedValue(makeProfile(42));
        usePresenceStore.setState({
            customStatusMap: {
                42: { emoji: "🤒", text: "Feeling sick, will still reply" },
            },
        });

        let controller: ReturnType<typeof useProfilePopoverController> | null =
            null;
        render(
            <ProfilePopoverProvider>
                <TestConsumer onReady={(c) => (controller = c)} />
            </ProfilePopoverProvider>,
        );

        await act(async () => {
            controller?.openFromCoords({
                x: 200,
                y: 200,
                senderUserId: 42,
                senderName: "Andrew",
                senderAvatar: { mode: "fallback" },
            });
        });

        expect(
            screen.getByText("Feeling sick, will still reply"),
        ).toBeInTheDocument();
    });

    it("omits the status block when the mentioned user has none", async () => {
        mockGetUserProfile.mockResolvedValue(makeProfile(43));
        usePresenceStore.setState({ customStatusMap: {} });

        let controller: ReturnType<typeof useProfilePopoverController> | null =
            null;
        render(
            <ProfilePopoverProvider>
                <TestConsumer onReady={(c) => (controller = c)} />
            </ProfilePopoverProvider>,
        );

        await act(async () => {
            controller?.openFromCoords({
                x: 200,
                y: 200,
                senderUserId: 43,
                senderName: "Bob",
                senderAvatar: { mode: "fallback" },
            });
        });

        expect(
            document.querySelector('[data-user-profile-popover="true"]'),
        ).not.toBeNull();
        expect(screen.queryByText(/Feeling sick/)).not.toBeInTheDocument();
    });
});
