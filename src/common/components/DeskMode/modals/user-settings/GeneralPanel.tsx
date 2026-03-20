import React from 'react';
import { ChevronDown } from 'lucide-react';
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
        description="Auto-loads when you open WorkDash"
      >
        <div>
          <p
            id="default-workspace-sublabel"
            className="text-[10px] font-bold uppercase tracking-widest wd-text-muted mb-1.5"
          >
            Workspace
          </p>
          <div className="relative">
            <select
              id="default-workspace-select"
              aria-labelledby="default-workspace-sublabel"
              value={defaultWorkspaceId}
              onChange={(e) => setDefaultWorkspaceId(e.target.value)}
              className="wd-settings-select h-9 w-full appearance-none rounded-lg border wd-border-subtle px-3 pr-8 text-xs wd-text-primary outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)]"
              style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
            >
              <option value="">None — show workspace selector</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
            />
          </div>
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
