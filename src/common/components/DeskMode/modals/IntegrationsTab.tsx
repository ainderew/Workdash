import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  useIntegrationStore,
  type WorkspaceIntegration,
} from "@/common/store/integrationStore";
import {
  AVAILABLE_INTEGRATIONS,
  type IntegrationDefinition,
} from "@/common/config/integrations";
import { CONFIG } from "@/common/utils/config";

interface IntegrationsTabProps {
  workspaceId: string;
}

function IntegrationsTab({ workspaceId }: IntegrationsTabProps) {
  const {
    integrations,
    isLoading,
    error,
    fetchIntegrations,
    enableIntegration,
    updateIntegration,
    deleteIntegration,
    regenerateWebhookToken,
  } = useIntegrationStore();

  useEffect(() => {
    fetchIntegrations(workspaceId);
  }, [workspaceId, fetchIntegrations]);

  if (isLoading && integrations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin wd-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h3 className="text-sm font-semibold wd-text-primary">Integrations</h3>
        <p className="text-xs wd-text-muted mt-0.5">
          Enable plugins to add features to your workspace
        </p>
      </div>
      {error && (
        <div className="px-3 py-2 rounded-md text-xs font-medium bg-[var(--wd-danger)]/10 text-[var(--wd-danger)]">
          {error}
        </div>
      )}
      {AVAILABLE_INTEGRATIONS.map((def) => {
        const integration = integrations.find((i) => i.type === def.type);
        return (
          <IntegrationCard
            key={def.type}
            definition={def}
            integration={integration ?? null}
            workspaceId={workspaceId}
            onEnable={enableIntegration}
            onUpdate={updateIntegration}
            onDelete={deleteIntegration}
            onRegenerateToken={regenerateWebhookToken}
          />
        );
      })}
    </div>
  );
}

interface IntegrationCardProps {
  definition: IntegrationDefinition;
  integration: WorkspaceIntegration | null;
  workspaceId: string;
  onEnable: (
    workspaceId: string,
    type: string,
  ) => Promise<{ token: string | null; webhookUrl: string | null } | null>;
  onUpdate: (
    workspaceId: string,
    id: string,
    updates: { config?: Record<string, unknown>; isActive?: boolean },
  ) => Promise<void>;
  onDelete: (workspaceId: string, id: string) => Promise<void>;
  onRegenerateToken: (
    workspaceId: string,
    webhookId: string,
  ) => Promise<string | null>;
}

function IntegrationCard({
  definition,
  integration,
  workspaceId,
  onEnable,
  onUpdate,
  onDelete,
  onRegenerateToken,
}: IntegrationCardProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"token" | "url" | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const isEnabled = integration !== null;
  const isActive = integration?.isActive ?? false;

  const handleEnable = async () => {
    setIsEnabling(true);
    const result = await onEnable(workspaceId, definition.type);
    if (result) {
      setToken(result.token);
      setWebhookUrl(result.webhookUrl);
    }
    setIsEnabling(false);
  };

  const handleToggle = async () => {
    if (!integration) return;
    setIsToggling(true);
    await onUpdate(workspaceId, integration.id, { isActive: !isActive });
    setIsToggling(false);
  };

  const handleDelete = async () => {
    if (!integration) return;
    setIsDeleting(true);
    await onDelete(workspaceId, integration.id);
    setToken(null);
    setWebhookUrl(null);
    setIsDeleting(false);
  };

  const handleRegenerate = async () => {
    if (!integration?.webhookId) return;
    setIsRegenerating(true);
    const newToken = await onRegenerateToken(
      workspaceId,
      integration.webhookId,
    );
    if (newToken) setToken(newToken);
    setIsRegenerating(false);
  };

  const handleCopy = async (text: string, type: "token" | "url") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isEnabled && isActive
          ? "wd-border-subtle wd-bg-panel"
          : "wd-border-subtle wd-bg-panel opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{definition.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold wd-text-primary">
                {definition.name}
              </span>
              {isEnabled && isActive && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--wd-success)]/10 text-[var(--wd-success)]">
                  Active
                </span>
              )}
              {isEnabled && !isActive && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--wd-warning)]/10 text-[var(--wd-warning)]">
                  Paused
                </span>
              )}
            </div>
            <p className="text-xs wd-text-muted mt-0.5">
              {definition.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isEnabled && (
            <>
              <button
                type="button"
                onClick={handleToggle}
                disabled={isToggling}
                className="p-1.5 rounded-md wd-text-muted hover:wd-text-primary hover:wd-bg-elevated transition-colors"
                title={isActive ? "Pause" : "Resume"}
              >
                {isToggling ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Power size={14} />
                )}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-md text-[var(--wd-danger)] hover:bg-[var(--wd-danger)]/10 transition-colors"
                title="Remove integration"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </>
          )}
          {!isEnabled && (
            <button
              type="button"
              onClick={handleEnable}
              disabled={isEnabling}
              className="px-3 py-1 rounded-md text-xs font-semibold wd-btn-primary transition-colors"
            >
              {isEnabling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "Enable"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Token + URL display (shown once after enable or regenerate) */}
      {token && (
        <div className="mt-3 p-3 rounded-md wd-bg-elevated border wd-border-subtle space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--wd-warning)]">
            Save this token — it won&apos;t be shown again
          </p>
          {webhookUrl && (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] px-2 py-1 rounded wd-bg-panel wd-text-muted font-mono truncate">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(webhookUrl, "url")}
                className="p-1 rounded wd-text-muted hover:wd-text-primary"
                title="Copy URL"
              >
                {copied === "url" ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] px-2 py-1 rounded wd-bg-panel wd-text-muted font-mono truncate">
              {token}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(token, "token")}
              className="p-1 rounded wd-text-muted hover:wd-text-primary"
              title="Copy token"
            >
              {copied === "token" ? (
                <Check size={12} />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Config section */}
      {isEnabled && definition.configFields.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 text-xs wd-text-muted hover:wd-text-primary transition-colors"
          >
            {showConfig ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            Configure
          </button>

          {showConfig && (
            <div className="mt-2 space-y-3">
              {definition.hasWebhook && integration.webhookId && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide wd-text-muted">
                    Webhook Endpoint
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] px-2 py-1 rounded wd-bg-elevated wd-text-muted font-mono truncate">
                      {`${CONFIG.SFU_SERVER_URL}/api/webhooks/${integration.webhookId}`}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          `${CONFIG.SFU_SERVER_URL}/api/webhooks/${integration.webhookId}`,
                          "url",
                        )
                      }
                      className="p-1 rounded wd-text-muted hover:wd-text-primary"
                      title="Copy webhook URL"
                    >
                      {copied === "url" ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {definition.hasWebhook && integration.webhookId && (
                <div className="flex items-center gap-2 pt-2 border-t wd-border-subtle">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs wd-text-muted hover:wd-text-primary wd-bg-elevated hover:wd-bg-panel transition-colors"
                  >
                    {isRegenerating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    Regenerate Token
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IntegrationsTab;
