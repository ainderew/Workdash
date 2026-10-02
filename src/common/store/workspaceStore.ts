import { create } from "zustand";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type { Workspace } from "@/communication/chatV2/_types";
import { trackEvent } from "@/common/utils/trackEvent";

type WorkspaceState = {
    workspaces: Workspace[];
    isLoading: boolean;
    isCreating: boolean;
    error: string | null;

    fetchMyWorkspaces: () => Promise<void>;
    fetchWorkspaceDetail: (workspaceId: string) => Promise<void>;
    createWorkspace: (name: string, iconUrl?: string) => Promise<Workspace | null>;
    updateWorkspaceLocal: (
        workspaceId: string,
        patch: Partial<Pick<Workspace, "name" | "iconUrl" | "loungeChannelId">>,
    ) => void;
    applyWorkspaceUpdate: (workspace: Workspace) => void;
};

const getChatV2Service = () => ChatV2Service.getInstance();

const useWorkspaceStore = create<WorkspaceState>((set) => ({
    workspaces: [],
    isLoading: false,
    isCreating: false,
    error: null,

    fetchMyWorkspaces: async () => {
        set({ isLoading: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const workspaces = await chatV2Service.listWorkspaces();
            set({ workspaces, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load workspaces",
            });
        }
    },

    fetchWorkspaceDetail: async (workspaceId) => {
        try {
            const chatV2Service = getChatV2Service();
            const workspace = await chatV2Service.getWorkspace(workspaceId);
            set((state) => ({
                workspaces: state.workspaces.map((ws) =>
                    ws.id === workspaceId ? { ...ws, ...workspace } : ws,
                ),
            }));
        } catch {
            // Non-critical — permissions will fall back to empty
        }
    },

    createWorkspace: async (name, iconUrl) => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        set({ isCreating: true, error: null });

        try {
            const chatV2Service = getChatV2Service();
            const payload: { name: string; iconUrl?: string } = { name: trimmed };
            if (iconUrl !== undefined) {
                payload.iconUrl = iconUrl;
            }
            const workspace = await chatV2Service.createWorkspace(payload);
            trackEvent("den_created");

            set((state) => ({
                isCreating: false,
                workspaces: [...state.workspaces, workspace],
            }));

            return workspace;
        } catch (error) {
            set({
                isCreating: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create workspace",
            });
            return null;
        }
    },

    applyWorkspaceUpdate: (workspace) => {
        set((state) => ({
            workspaces: state.workspaces.map((ws) =>
                ws.id === workspace.id ? { ...ws, ...workspace } : ws,
            ),
        }));
    },

    updateWorkspaceLocal: (workspaceId, patch) => {
        set((state) => ({
            workspaces: state.workspaces.map((ws) => {
                if (ws.id !== workspaceId) return ws;
                return {
                    ...ws,
                    ...(patch.name !== undefined ? { name: patch.name } : {}),
                    ...(patch.iconUrl !== undefined ? { iconUrl: patch.iconUrl } : {}),
                    ...(patch.loungeChannelId !== undefined
                        ? { loungeChannelId: patch.loungeChannelId }
                        : {}),
                };
            }),
        }));
    },
}));

export default useWorkspaceStore;
