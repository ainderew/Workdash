import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import IntegrationSidebar from "./IntegrationSidebar";
import type { WorkspaceIntegration } from "@/common/store/integrationStore";

vi.mock("@/common/store/integrationStore", () => {
  let integrations: WorkspaceIntegration[] = [];
  return {
    useIntegrationStore: (selector: (s: { integrations: WorkspaceIntegration[] }) => unknown) =>
      selector({ integrations }),
    __setIntegrations: (data: WorkspaceIntegration[]) => {
      integrations = data;
    },
  };
});

vi.mock("./PZSidebar", () => ({
  default: ({ workspaceId, integrationId }: { workspaceId: string; integrationId: string }) => (
    <div data-testid="pz-sidebar">
      PZSidebar {workspaceId} {integrationId}
    </div>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockModule = await import("@/common/store/integrationStore") as any;

function makeIntegration(
  overrides: Partial<WorkspaceIntegration> = {},
): WorkspaceIntegration {
  return {
    id: "int-1",
    workspaceId: "ws-1",
    type: "pz_server",
    isActive: true,
    config: {},
    webhookId: null,
    webhook: null,
    enabledAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("IntegrationSidebar", () => {
  beforeEach(() => {
    mockModule.__setIntegrations([]);
  });

  it("returns null when no PZ integration is active", () => {
    mockModule.__setIntegrations([]);

    const { container } = render(
      <IntegrationSidebar workspaceId="ws-1" />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders PZSidebar when PZ integration exists and is active", () => {
    mockModule.__setIntegrations([makeIntegration({ id: "pz-123" })]);

    render(<IntegrationSidebar workspaceId="ws-1" />);

    expect(screen.getByText(/PZSidebar ws-1 pz-123/)).toBeInTheDocument();
  });

  it("returns null when PZ integration exists but is inactive", () => {
    mockModule.__setIntegrations([
      makeIntegration({ isActive: false }),
    ]);

    const { container } = render(
      <IntegrationSidebar workspaceId="ws-1" />,
    );

    expect(container.innerHTML).toBe("");
  });
});
