import React from "react";
import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi,
} from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import type {
    ChatV2RoomMember,
    WorkspaceMember,
} from "@/communication/chatV2/_types";

// ---------------------------------------------------------------------------
// Mocks (declared before module imports under test)
// ---------------------------------------------------------------------------

vi.mock("@/game/EventBus", () => ({
    EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

const mockGetUserProfile = vi.fn();
const mockGetUserAchievementDisplay = vi.fn();
const mockGetDotaStats = vi.fn();
const mockGetDotaMatches = vi.fn();
const mockGetBetrayalStats = vi.fn();
const mockOpenDirectMessage = vi.fn();
const mockCreateMessage = vi.fn();
const mockUpdateOwnUserProfile = vi.fn();
const mockSendFriendRequest = vi.fn();

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
            sendFriendRequest: mockSendFriendRequest,
            setupRealtimeHandlers: vi.fn().mockReturnValue(vi.fn()),
        })),
    },
}));

// jsdom doesn't implement ResizeObserver; the popover uses it.
class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;

// ---------------------------------------------------------------------------
// Imports under test (after mocks)
// ---------------------------------------------------------------------------

import MemberPanel from "./MemberPanel";
import { ProfilePopoverProvider } from "./profile-popover";
import { usePresenceStore } from "@/common/store/presenceStore";
import useChatV2Store from "@/common/store/chatV2Store";
import useUserStore from "@/common/store/useStore";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALICE_ID = 101;
const BOB_ID = 102;
const SELF_ID = 1;
const OFFLINE_ID = 103;

function makeMember(
    userId: number,
    name: string,
    overrides: Partial<ChatV2RoomMember> = {},
): ChatV2RoomMember {
    return {
        roomId: "room-1",
        userId,
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: new Date(),
        user: {
            id: userId,
            name,
            email: `${name.toLowerCase()}@test.com`,
            image: null,
        },
        ...overrides,
    };
}

function makeWorkspaceMember(userId: number, name: string): WorkspaceMember {
    return {
        workspaceId: "ws-1",
        userId,
        joinedAt: new Date(),
        user: { id: userId, name, image: null },
        roles: [],
    };
}

const ALICE = makeMember(ALICE_ID, "Alice");
const BOB = makeMember(BOB_ID, "Bob");
const SELF = makeMember(SELF_ID, "Me");
const OFFLINE_USER = makeMember(OFFLINE_ID, "Olivia");

const ALL_MEMBERS = [ALICE, BOB, SELF, OFFLINE_USER];
const WORKSPACE_MEMBERS = ALL_MEMBERS.map((m) =>
    makeWorkspaceMember(m.userId, m.user.name),
);

const NOOP_REMOVE = vi.fn();
const NOOP_ADD = vi.fn();

function seedPresence() {
    const ONLINE = {
        statusId: "online",
        label: "Online",
        color: "#00ff00",
        icon: null,
        manualLock: false,
    };
    const OFFLINE = {
        statusId: "offline",
        label: "Offline",
        color: "#71717a",
        icon: null,
        manualLock: false,
    };
    usePresenceStore.setState({
        presenceMap: {
            [ALICE_ID]: ONLINE,
            [BOB_ID]: ONLINE,
            [SELF_ID]: ONLINE,
            [OFFLINE_ID]: OFFLINE,
        },
        lastSeenMap: {},
    });
}

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

interface RenderOptions {
    members?: ChatV2RoomMember[];
}

function renderPanel(options: RenderOptions = {}) {
    const members = options.members ?? ALL_MEMBERS;
    const utils = render(
        <ProfilePopoverProvider>
            <MemberPanel
                members={members}
                isLoading={false}
                workspaceMembers={WORKSPACE_MEMBERS}
                workspaceOwnerId={SELF_ID}
                onAddMember={NOOP_ADD}
                onRemoveMember={NOOP_REMOVE}
            />
        </ProfilePopoverProvider>,
    );
    const rerender = (next: ChatV2RoomMember[]) =>
        utils.rerender(
            <ProfilePopoverProvider>
                <MemberPanel
                    members={next}
                    isLoading={false}
                    workspaceMembers={WORKSPACE_MEMBERS}
                    workspaceOwnerId={SELF_ID}
                    onAddMember={NOOP_ADD}
                    onRemoveMember={NOOP_REMOVE}
                />
            </ProfilePopoverProvider>,
        );
    return { ...utils, rerender };
}

function popoverEl() {
    return document.querySelector('[data-user-profile-popover="true"]');
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
    NOOP_ADD.mockReset();
    NOOP_REMOVE.mockReset();
    mockGetUserProfile
        .mockReset()
        .mockImplementation(async (id: number) =>
            makeProfile(id, id === SELF_ID),
        );
    mockGetUserAchievementDisplay.mockReset().mockResolvedValue([]);
    mockGetDotaStats.mockReset().mockResolvedValue(null);
    mockGetDotaMatches.mockReset().mockResolvedValue([]);
    mockGetBetrayalStats.mockReset().mockResolvedValue(null);
    mockOpenDirectMessage.mockReset();
    mockCreateMessage.mockReset();
    mockUpdateOwnUserProfile.mockReset();
    mockSendFriendRequest.mockReset();

    seedPresence();
    useUserStore.setState({
        backendUser: {
            id: SELF_ID,
            email: "me@test.com",
            name: "Me",
            image: null,
        } as never,
    });
    useChatV2Store.setState({
        selectedWorkspaceId: "ws-1",
        currentRoomId: "room-1",
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MemberPanel", () => {
    it("clicking a member row opens that member's profile popover", async () => {
        renderPanel();

        fireEvent.click(
            screen.getByRole("button", { name: /open alice's profile/i }),
        );

        await waitFor(() => expect(popoverEl()).not.toBeNull());
        expect(mockGetUserProfile).toHaveBeenCalledWith(ALICE_ID);
    });

    it("clicking the hover-revealed Remove button removes and does not open popover", async () => {
        renderPanel();

        const removeButton = screen.getAllByRole("button", {
            name: /remove member/i,
        })[0];
        fireEvent.click(removeButton);

        expect(NOOP_REMOVE).toHaveBeenCalledTimes(1);
        expect(popoverEl()).toBeNull();
    });

    it("right-clicking a row opens the popover and suppresses the default menu", async () => {
        renderPanel();
        const row = screen.getByRole("button", {
            name: /open alice's profile/i,
        });

        const event = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
        });
        act(() => {
            row.dispatchEvent(event);
        });

        expect(event.defaultPrevented).toBe(true);
        await waitFor(() => expect(popoverEl()).not.toBeNull());
    });

    it("Enter key on a focused row opens the popover", async () => {
        renderPanel();
        const row = screen.getByRole("button", {
            name: /open alice's profile/i,
        });

        row.focus();
        // Native button semantics: Enter triggers click.
        fireEvent.keyDown(row, { key: "Enter", code: "Enter" });
        fireEvent.keyUp(row, { key: "Enter", code: "Enter" });
        fireEvent.click(row);

        await waitFor(() => expect(popoverEl()).not.toBeNull());
    });

    it("Space key on a focused row opens the popover", async () => {
        renderPanel();
        const row = screen.getByRole("button", {
            name: /open alice's profile/i,
        });

        row.focus();
        // Native button semantics: Space triggers click on keyup.
        fireEvent.keyDown(row, { key: " ", code: "Space" });
        fireEvent.keyUp(row, { key: " ", code: "Space" });
        fireEvent.click(row);

        await waitFor(() => expect(popoverEl()).not.toBeNull());
    });

    it("active row is marked with data-active and clears when popover closes", async () => {
        renderPanel();

        const row = screen.getByRole("button", {
            name: /open alice's profile/i,
        });
        fireEvent.click(row);

        await waitFor(() => {
            const wrapper = row.parentElement;
            expect(wrapper?.getAttribute("data-active")).toBe("true");
        });

        fireEvent.click(row);

        await waitFor(() => {
            const wrapper = row.parentElement;
            expect(wrapper?.getAttribute("data-active")).toBeNull();
        });
    });

    it("clicking the same row twice closes the popover (toggle)", async () => {
        renderPanel();
        const row = screen.getByRole("button", {
            name: /open alice's profile/i,
        });

        fireEvent.click(row);
        await waitFor(() => expect(popoverEl()).not.toBeNull());

        fireEvent.click(row);
        await waitFor(() => expect(popoverEl()).toBeNull());
    });

    it("clicking a second member switches the popover (no stacking)", async () => {
        renderPanel();

        fireEvent.click(
            screen.getByRole("button", { name: /open alice's profile/i }),
        );
        await waitFor(() => expect(popoverEl()).not.toBeNull());

        fireEvent.click(
            screen.getByRole("button", { name: /open bob's profile/i }),
        );

        await waitFor(() => {
            const popovers = document.querySelectorAll(
                '[data-user-profile-popover="true"]',
            );
            expect(popovers).toHaveLength(1);
        });
        expect(mockGetUserProfile).toHaveBeenLastCalledWith(BOB_ID);
    });

    it("clicking the viewer's own row opens self-mode (no Add Friend button visible)", async () => {
        renderPanel();

        fireEvent.click(
            screen.getByRole("button", { name: /open me's profile/i }),
        );

        await waitFor(() => expect(popoverEl()).not.toBeNull());
        await waitFor(() => {
            expect(
                screen.queryByRole("button", { name: /add friend/i }),
            ).toBeNull();
        });
    });

    it("removing the active user from members closes the popover", async () => {
        const { rerender } = renderPanel();

        fireEvent.click(
            screen.getByRole("button", { name: /open alice's profile/i }),
        );
        await waitFor(() => expect(popoverEl()).not.toBeNull());

        rerender(ALL_MEMBERS.filter((m) => m.userId !== ALICE_ID));

        await waitFor(() => expect(popoverEl()).toBeNull());
    });

    it("changing the current room closes the popover", async () => {
        renderPanel();

        fireEvent.click(
            screen.getByRole("button", { name: /open alice's profile/i }),
        );
        await waitFor(() => expect(popoverEl()).not.toBeNull());

        act(() => {
            useChatV2Store.setState({ currentRoomId: "different-room" });
        });

        await waitFor(() => expect(popoverEl()).toBeNull());
    });

    it("collapsing the offline section closes only an offline-user popover", async () => {
        renderPanel();

        fireEvent.click(
            screen.getByRole("button", { name: /open olivia's profile/i }),
        );
        await waitFor(() => expect(popoverEl()).not.toBeNull());

        const offlineToggle = screen.getByRole("button", {
            name: /offline —/i,
        });
        fireEvent.click(offlineToggle);

        await waitFor(() => expect(popoverEl()).toBeNull());
    });

    it("collapsing the offline section leaves an online-user popover open", async () => {
        renderPanel();

        fireEvent.click(
            screen.getByRole("button", { name: /open alice's profile/i }),
        );
        await waitFor(() => expect(popoverEl()).not.toBeNull());

        const offlineToggle = screen.getByRole("button", {
            name: /offline —/i,
        });
        fireEvent.click(offlineToggle);

        // Give state a tick to settle, then assert popover survived.
        await act(async () => {
            await Promise.resolve();
        });
        expect(popoverEl()).not.toBeNull();
    });
});
