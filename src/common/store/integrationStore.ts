import { create } from "zustand";
import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";

export interface WorkspaceIntegration {
  id: string;
  workspaceId: string;
  type: string;
  isActive: boolean;
  config: Record<string, unknown>;
  webhookId: string | null;
  webhook: {
    id: string;
    name: string;
    avatarUrl: string | null;
    isActive: boolean;
  } | null;
  enabledAt: string | null;
  createdAt: string;
}

interface EnableResult {
  integration: WorkspaceIntegration;
  token: string | null;
  webhookUrl: string | null;
}

interface IntegrationUpdate {
  config?: Record<string, unknown>;
  isActive?: boolean;
}

interface IntegrationState {
  integrations: WorkspaceIntegration[];
  isLoading: boolean;
  error: string | null;

  fetchIntegrations: (workspaceId: string) => Promise<void>;
  enableIntegration: (
    workspaceId: string,
    type: string,
  ) => Promise<EnableResult | null>;
  updateIntegration: (
    workspaceId: string,
    id: string,
    updates: IntegrationUpdate,
  ) => Promise<void>;
  deleteIntegration: (workspaceId: string, id: string) => Promise<void>;
  regenerateWebhookToken: (
    workspaceId: string,
    webhookId: string,
  ) => Promise<string | null>;
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getJwt()}`,
  };
}

function apiUrl(path: string): string {
  return `${CONFIG.SFU_SERVER_URL}${path}`;
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],
  isLoading: false,
  error: null,

  async fetchIntegrations(workspaceId: string) {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/integrations`),
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error("Failed to fetch integrations");
      const data = await res.json();
      set({ integrations: data.integrations, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        isLoading: false,
      });
    }
  },

  async enableIntegration(workspaceId: string, type: string) {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/integrations`),
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ type }),
        },
      );
      if (!res.ok) throw new Error("Failed to enable integration");
      const data = await res.json();
      // Refresh the list
      await get().fetchIntegrations(workspaceId);
      return data as EnableResult;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to enable",
      });
      return null;
    }
  },

  async updateIntegration(
    workspaceId: string,
    id: string,
    updates: IntegrationUpdate,
  ) {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/integrations/${id}`),
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(updates),
        },
      );
      if (!res.ok) throw new Error("Failed to update integration");
      await get().fetchIntegrations(workspaceId);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update",
      });
    }
  },

  async deleteIntegration(workspaceId: string, id: string) {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${workspaceId}/integrations/${id}`),
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      if (!res.ok) throw new Error("Failed to delete integration");
      await get().fetchIntegrations(workspaceId);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete",
      });
    }
  },

  async regenerateWebhookToken(workspaceId: string, webhookId: string) {
    try {
      const res = await fetch(
        apiUrl(
          `/api/workspaces/${workspaceId}/webhooks/${webhookId}/regenerate-token`,
        ),
        {
          method: "POST",
          headers: authHeaders(),
        },
      );
      if (!res.ok) throw new Error("Failed to regenerate token");
      const data = await res.json();
      return data.token as string;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to regenerate",
      });
      return null;
    }
  },
}));
