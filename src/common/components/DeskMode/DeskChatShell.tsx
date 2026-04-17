import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import useChatV2Store from "@/common/store/chatV2Store";
import useWorkspaceStore from "@/common/store/workspaceStore";
import useUiStore from "@/common/store/uiStore";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type {
    AwardTagData,
    ChatV2Room,
    WorkspaceMember,
} from "@/communication/chatV2/_types";
import type { Workspace } from "@/communication/chatV2/_types";
import { useWorkspacePermissions } from "@/common/hooks/useWorkspacePermissions";
import { buildMemberColorMap } from "@/common/utils/roleColor";
import { useCustomEmojiList } from "@/common/hooks/useCustomEmojiList";
import { useSoundboardList } from "@/common/components/Soundboard/hooks/useSoundboardList";
import { useIntegrationStore } from "@/common/store/integrationStore";
import GuildRail from "./GuildRail";
import FloatingCallWindow from "./FloatingCallWindow";
import FloatingPassiveCallIndicator from "./FloatingPassiveCallIndicator";
import ServerSettingsModal from "./modals/ServerSettingsModal";
import WorkspaceMembersModal from "./modals/WorkspaceMembersModal";
import JoinByInviteModal from "./modals/JoinByInviteModal";
import AchievementsModal from "./modals/AchievementsModal";
import { ChannelSidebarContainer } from "./ChannelSidebarContainer";
import { ChatPaneContainer } from "./ChatPaneContainer";

export type DeskChatShellMode = "desk" | "drawer";

interface DeskChatShellProps {
    mode?: DeskChatShellMode;
    onClose?: () => void;
}

function DeskChatShell({ mode = "desk", onClose }: DeskChatShellProps) {
    const selectedWorkspaceId = useChatV2Store(
        (s) => s.selectedWorkspaceId,
    );
    useCustomEmojiList(selectedWorkspaceId);
    useSoundboardList(selectedWorkspaceId);

    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const initialize = useChatV2Store((s) => s.initialize);
    const railView = useChatV2Store((s) => s.railView);
    const setRailView = useChatV2Store((s) => s.setRailView);
    const setSelectedWorkspaceId = useChatV2Store(
        (s) => s.setSelectedWorkspaceId,
    );
    const chatInitialized = useChatV2Store((s) => s.initialized);
    const reloadRoomStructure = useChatV2Store((s) => s.reloadRoomStructure);
    const selectRoom = useChatV2Store((s) => s.selectRoom);
    const currentRoomId = useChatV2Store((s) => s.currentRoomId);
    const roomsById = useChatV2Store((s) => s.roomsById);
    const roomOrder = useChatV2Store((s) => s.roomOrder);
    const unreadByRoomId = useChatV2Store((s) => s.unreadByRoomId);
    const getWorkspaceUnreadTotal = useChatV2Store(
        (s) => s.getWorkspaceUnreadTotal,
    );
    const getDirectUnreadTotal = useChatV2Store(
        (s) => s.getDirectUnreadTotal,
    );

    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const fetchMyWorkspaces = useWorkspaceStore((s) => s.fetchMyWorkspaces);
    const storeCreateWorkspace = useWorkspaceStore((s) => s.createWorkspace);
    const updateWorkspaceLocal = useWorkspaceStore(
        (s) => s.updateWorkspaceLocal,
    );

    const integrations = useIntegrationStore((s) => s.integrations);
    const activePZ = !!integrations.find(
        (i) => i.type === "pz_server" && i.isActive,
    );

    const isAchievementsModalOpen = useUiStore(
        (s) => s.isAchievementsModalOpen,
    );
    const closeAchievementsModal = useUiStore((s) => s.closeAchievementsModal);

    const [serverImageOverrides, setServerImageOverrides] = useState<
        Record<string, string | null>
    >({});
    const [serverNameOverrides, setServerNameOverrides] = useState<
        Record<string, string>
    >({});
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
    const [createWorkspaceName, setCreateWorkspaceName] = useState("");
    const [serverSettingsTargetId, setServerSettingsTargetId] = useState<
        string | null
    >(null);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [membersModalTab, setMembersModalTab] = useState<
        "members" | "invites"
    >("members");
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinInviteCode, setJoinInviteCode] = useState<string | undefined>(
        undefined,
    );

    // --- Consolidated initialization ---

    useEffect(() => {
        void initialize();
        void fetchMyWorkspaces();
    }, [initialize, fetchMyWorkspaces]);

    const prevWsRef = useRef<string | null>(null);
    useEffect(() => {
        if (!chatInitialized || !selectedWorkspaceId) return;
        if (prevWsRef.current === selectedWorkspaceId) return;
        prevWsRef.current = selectedWorkspaceId;

        void (async () => {
            await reloadRoomStructure();
            const roomId = useChatV2Store.getState().currentRoomId;
            if (roomId) void selectRoom(roomId);
            void useIntegrationStore
                .getState()
                .fetchIntegrations(selectedWorkspaceId);
        })();
    }, [chatInitialized, selectedWorkspaceId, reloadRoomStructure, selectRoom]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get("invite");
        if (inviteCode) {
            setJoinInviteCode(inviteCode);
            setIsJoinModalOpen(true);
            const url = new URL(window.location.href);
            url.searchParams.delete("invite");
            window.history.replaceState({}, "", url.toString());
        }
    }, []);

    // --- Workspace derivations ---

    const rooms = useMemo<ChatV2Room[]>(
        () => roomOrder.map((id) => roomsById[id]).filter(Boolean),
        [roomOrder, roomsById],
    );

    const workspaceOptions = useMemo(() => {
        if (workspaces.length > 0) {
            return workspaces.map((ws) => ({
                id: ws.id,
                name:
                    serverNameOverrides[ws.id] ||
                    ws.name?.trim() ||
                    "Workspace",
                unreadCount: getWorkspaceUnreadTotal(ws.id),
                imageUrl:
                    serverImageOverrides[ws.id] !== undefined
                        ? serverImageOverrides[ws.id]
                        : (ws.iconUrl ?? null),
            }));
        }

        return Array.from(
            new Map(
                rooms
                    .filter((room) => room.type !== "DIRECT")
                    .map((room) => [
                        room.workspaceId,
                        {
                            id: room.workspaceId,
                            name:
                                serverNameOverrides[room.workspaceId] ||
                                room.workspace?.name?.trim() ||
                                "Workspace",
                            unreadCount: getWorkspaceUnreadTotal(
                                room.workspaceId,
                            ),
                            imageUrl:
                                serverImageOverrides[room.workspaceId] !==
                                undefined
                                    ? serverImageOverrides[room.workspaceId]
                                    : (room.workspace?.imageUrl ?? null),
                        },
                    ]),
            ).values(),
        );
    }, [
        getWorkspaceUnreadTotal,
        rooms,
        serverImageOverrides,
        serverNameOverrides,
        workspaces,
        unreadByRoomId,
    ]);

    const currentRoom = currentRoomId ? roomsById[currentRoomId] : null;

    const serverName = useMemo(() => {
        if (railView === "dm") return "Direct Messages";
        if (selectedWorkspaceId) {
            const ws = workspaceOptions.find(
                (entry) => entry.id === selectedWorkspaceId,
            );
            if (ws?.name) return ws.name;
        }
        const preferred = currentRoom?.workspace?.name?.trim();
        if (preferred) return preferred;
        return workspaceOptions[0]?.name || "Workdash Server";
    }, [currentRoom, railView, selectedWorkspaceId, workspaceOptions]);

    const serverImageUrl = useMemo(() => {
        if (railView === "dm") return null;
        if (selectedWorkspaceId) {
            const ws = workspaceOptions.find(
                (entry) => entry.id === selectedWorkspaceId,
            );
            return ws?.imageUrl ?? null;
        }
        return workspaceOptions[0]?.imageUrl ?? null;
    }, [railView, selectedWorkspaceId, workspaceOptions]);

    const handleServerImageChanged = useCallback(
        (serverId: string, imageUrl: string | null) => {
            setServerImageOverrides((current) => ({
                ...current,
                [serverId]: imageUrl,
            }));
            updateWorkspaceLocal(serverId, { iconUrl: imageUrl });
        },
        [updateWorkspaceLocal],
    );

    const handleServerRenamed = useCallback(
        (serverId: string, name: string) => {
            setServerNameOverrides((current) => ({
                ...current,
                [serverId]: name,
            }));
            updateWorkspaceLocal(serverId, { name });
        },
        [updateWorkspaceLocal],
    );

    const handleCreateWorkspace = useCallback(async () => {
        const trimmed = createWorkspaceName.trim();
        if (!trimmed) return;
        const workspace = await storeCreateWorkspace(trimmed);
        if (workspace) {
            setCreateWorkspaceName("");
            setIsCreateWorkspaceOpen(false);
            setRailView("server");
            setSelectedWorkspaceId(workspace.id);
            await reloadRoomStructure();
        }
    }, [
        createWorkspaceName,
        storeCreateWorkspace,
        setRailView,
        setSelectedWorkspaceId,
        reloadRoomStructure,
    ]);

    const selectedWorkspace = useMemo(
        () => workspaces.find((ws) => ws.id === selectedWorkspaceId),
        [workspaces, selectedWorkspaceId],
    );

    const {
        viewerUserId,
        canKickMembers,
        canBanMembers,
        canManageRoles,
        canCreateInvite,
    } = useWorkspacePermissions(selectedWorkspaceId);

    // --- Workspace members + role colors ---

    const [memberRoleColors, setMemberRoleColors] = useState<
        Map<number, string>
    >(new Map());
    const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);

    useEffect(() => {
        if (!selectedWorkspaceId) {
            setMemberRoleColors(new Map());
            setWsMembers([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const [members] = await Promise.all([
                    chatV2Service.listWorkspaceMembers(selectedWorkspaceId),
                ]);
                if (cancelled) return;
                const ownerUserId = selectedWorkspace?.ownerId ?? 0;
                setMemberRoleColors(
                    buildMemberColorMap(members, ownerUserId),
                );
                setWsMembers(members);
            } catch {
                // Non-critical — names just won't be colored
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedWorkspaceId, chatV2Service, selectedWorkspace?.ownerId]);

    const awardTagMap = useMemo(() => {
        const map = new Map<number, AwardTagData>();
        for (const wm of wsMembers) {
            if (wm.awardTag) map.set(wm.userId, wm.awardTag);
        }
        return map;
    }, [wsMembers]);

    const awardTagUpdate = useChatV2Store((s) => s.awardTagUpdate);
    useEffect(() => {
        if (!awardTagUpdate) return;
        if (awardTagUpdate.workspaceId !== selectedWorkspaceId) return;
        const { awards } = awardTagUpdate;
        if (!awards || Object.keys(awards).length === 0) return;
        setWsMembers((prev) => {
            let changed = false;
            const next = prev.map((m) => {
                const key = String(m.userId);
                if (!(key in awards)) return m;
                changed = true;
                return { ...m, awardTag: awards[key] ?? null };
            });
            return changed ? next : prev;
        });
    }, [awardTagUpdate, selectedWorkspaceId]);

    // --- Render ---

    const rootContainerClassName =
        mode === "desk"
            ? "fixed inset-0 z-30 h-[100dvh] w-screen overflow-hidden flex flex-col wd-bg-overlay backdrop-blur-sm wd-desk-mode-filled-icons"
            : "h-full w-full overflow-hidden flex flex-col wd-bg-overlay wd-desk-mode-filled-icons";

    return (
        <section className={rootContainerClassName}>
            <div className="h-9 flex shrink-0">
                <div className="w-[72px] shrink-0 wd-bg-app" />
                <div className="flex-1 min-w-0 wd-bg-app flex items-center justify-center gap-1.5 px-4">
                    {serverImageUrl && (
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded">
                            <Image
                                src={serverImageUrl}
                                alt=""
                                width={16}
                                height={16}
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        </span>
                    )}
                    <p className="truncate text-sm wd-text-primary text-center">
                        {serverName}
                    </p>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                <GuildRail
                    workspaces={workspaceOptions}
                    railView={railView}
                    selectedWorkspaceId={selectedWorkspaceId}
                    dmUnreadCount={getDirectUnreadTotal()}
                    onSelectWorkspace={(workspaceId) => {
                        setRailView("server");
                        setSelectedWorkspaceId(workspaceId);
                        void reloadRoomStructure().then(() => {
                            const roomId =
                                useChatV2Store.getState().currentRoomId;
                            if (roomId) {
                                void selectRoom(roomId);
                            }
                        });
                    }}
                    onSelectDm={() => {
                        setRailView("dm");
                        const state = useChatV2Store.getState();
                        const firstDmRoom = state.directRoomOrder
                            .map((id) => state.directRoomsById[id])
                            .filter(Boolean)
                            .find((entry) => {
                                const room = entry.room;
                                if (!room) return false;
                                if (room.type === "DIRECT") return true;
                                if (room.viewerRole === undefined) return true;
                                return room.viewerRole !== null;
                            })?.room.id;
                        if (firstDmRoom) {
                            void state.selectRoom(firstDmRoom);
                        }
                    }}
                    onChangeServerImage={(workspaceId) => {
                        setServerSettingsTargetId(workspaceId);
                    }}
                    onCreateWorkspace={() => {
                        setIsCreateWorkspaceOpen(true);
                    }}
                    onOpenMembers={() => {
                        setMembersModalTab("members");
                        setIsMembersModalOpen(true);
                    }}
                />

                <div className="flex-1 min-w-0 pb-2 flex">
                    <div className="flex-1 min-w-0 h-full min-h-0 flex rounded-lg overflow-visible outline-1 outline-[color:var(--wd-border-subtle)] shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_14px_rgba(88,101,242,0.08)]">
                        <ChannelSidebarContainer
                            serverName={serverName}
                            serverImageUrl={serverImageUrl}
                            mode={mode}
                            onClose={onClose}
                            onServerImageChanged={handleServerImageChanged}
                            onServerRenamed={handleServerRenamed}
                            onOpenMembers={() => {
                                setMembersModalTab("members");
                                setIsMembersModalOpen(true);
                            }}
                            onInvitePeople={() => {
                                setMembersModalTab("invites");
                                setIsMembersModalOpen(true);
                            }}
                        />

                        <ChatPaneContainer
                            serverName={serverName}
                            mode={mode}
                            onClose={onClose}
                            memberRoleColors={memberRoleColors}
                            awardTagMap={awardTagMap}
                            wsMembers={wsMembers}
                            workspaceOwnerId={
                                selectedWorkspace?.ownerId ?? 0
                            }
                            activePZ={activePZ}
                        />
                    </div>
                </div>
            </div>

            <FloatingCallWindow />
            <FloatingPassiveCallIndicator />

            <ServerSettingsModal
                isOpen={!!serverSettingsTargetId}
                serverId={serverSettingsTargetId}
                serverName={
                    workspaceOptions.find(
                        (w) => w.id === serverSettingsTargetId,
                    )?.name || serverName
                }
                currentImageUrl={
                    serverSettingsTargetId
                        ? (workspaceOptions.find(
                              (w) => w.id === serverSettingsTargetId,
                          )?.imageUrl ?? null)
                        : null
                }
                onClose={() => setServerSettingsTargetId(null)}
                onImageChanged={(sid, imageUrl) => {
                    handleServerImageChanged(sid, imageUrl);
                    setServerSettingsTargetId(null);
                }}
                onServerRenamed={(sid, name) => {
                    handleServerRenamed(sid, name);
                    setServerSettingsTargetId(null);
                }}
            />

            <WorkspaceMembersModal
                isOpen={isMembersModalOpen}
                workspaceId={selectedWorkspaceId}
                workspaceName={serverName}
                workspaceOwnerId={selectedWorkspace?.ownerId ?? 0}
                viewerUserId={viewerUserId}
                viewerCanManageMembers={canKickMembers}
                viewerCanBanMembers={canBanMembers}
                viewerCanManageRoles={canManageRoles}
                viewerCanCreateInvite={canCreateInvite}
                initialTab={membersModalTab}
                onClose={() => setIsMembersModalOpen(false)}
            />

            <JoinByInviteModal
                isOpen={isJoinModalOpen}
                prefillCode={joinInviteCode}
                onClose={() => {
                    setIsJoinModalOpen(false);
                    setJoinInviteCode(undefined);
                }}
                onJoined={(workspace: Workspace) => {
                    void fetchMyWorkspaces();
                    setRailView("server");
                    setSelectedWorkspaceId(workspace.id);
                    void reloadRoomStructure();
                }}
            />

            <AchievementsModal
                isOpen={isAchievementsModalOpen}
                onClose={closeAchievementsModal}
            />

            {isCreateWorkspaceOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-96 rounded-xl wd-bg-panel p-6 shadow-xl">
                        <h2 className="text-lg font-semibold wd-text-primary mb-4">
                            Create Workspace
                        </h2>
                        <input
                            type="text"
                            value={createWorkspaceName}
                            onChange={(e) =>
                                setCreateWorkspaceName(e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    void handleCreateWorkspace();
                                }
                            }}
                            placeholder="Workspace name"
                            className="w-full rounded-lg border wd-border-subtle wd-bg-elevated px-3 py-2 text-sm wd-text-primary placeholder:wd-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--wd-accent)]"
                            autoFocus
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreateWorkspaceOpen(false);
                                    setCreateWorkspaceName("");
                                }}
                                className="rounded-lg px-4 py-2 text-sm wd-text-secondary hover:wd-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleCreateWorkspace();
                                }}
                                disabled={!createWorkspaceName.trim()}
                                className="rounded-lg bg-[var(--wd-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default DeskChatShell;
