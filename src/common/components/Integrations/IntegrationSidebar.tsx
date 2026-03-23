import React from "react";
import { useIntegrationStore } from "@/common/store/integrationStore";
import PZSidebar from "./PZSidebar";

interface IntegrationSidebarProps {
  workspaceId: string;
}

function IntegrationSidebar({ workspaceId }: IntegrationSidebarProps) {
  const integrations = useIntegrationStore((s) => s.integrations);

  const activePZ = integrations.find(
    (i) => i.type === "pz_server" && i.isActive,
  );

  if (!activePZ) return null;

  return (
    <PZSidebar workspaceId={workspaceId} integrationId={activePZ.id} />
  );
}

export default IntegrationSidebar;
