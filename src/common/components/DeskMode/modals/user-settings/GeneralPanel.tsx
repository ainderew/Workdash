import React from 'react';
import { SettingsSection, SettingsToggle } from '../settings-primitives';
import { useGeneralSettings } from '../hooks/useGeneralSettings';

function GeneralPanel() {
  const {
    workspaces,
    defaultWorkspaceId,
    setDefaultWorkspaceId,
    autoJoinMusic,
    setAutoJoinMusic,
  } = useGeneralSettings();

  return (
    <div className="space-y-4">
      <SettingsSection
        label="Default Workspace"
        description="Choose which workspace to load automatically when you open WorkDash."
      >
        <div>
          <p
            id="default-workspace-sublabel"
            className="text-[10px] font-semibold uppercase tracking-wide wd-text-muted mb-1"
          >
            Workspace
          </p>
          <select
            id="default-workspace-select"
            aria-labelledby="default-workspace-sublabel"
            value={defaultWorkspaceId}
            onChange={(e) => setDefaultWorkspaceId(e.target.value)}
            className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-2 text-xs wd-text-primary outline-none transition-colors focus:border-[var(--wd-border-strong)]"
          >
            <option value="">None — show workspace selector</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      </SettingsSection>

      <SettingsSection label="Music">
        <SettingsToggle
          label="Auto-join music sessions"
          description="Automatically listen to music when entering a workspace with an active session"
          checked={autoJoinMusic}
          onChange={(checked) => setAutoJoinMusic(checked)}
        />
      </SettingsSection>
    </div>
  );
}

export default GeneralPanel;
